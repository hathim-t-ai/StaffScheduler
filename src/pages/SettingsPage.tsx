import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  SelectChangeEvent
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
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // Mock state for global settings
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(40);
  const [defaultWorkingHours, setDefaultWorkingHours] = useState(8);
  const [requireApproval, setRequireApproval] = useState(false);
  
  // Mock state for system preferences
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [colorScheme, setColorScheme] = useState('default');
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleDateFormatChange = (event: SelectChangeEvent) => {
    setDateFormat(event.target.value);
  };
  
  const handleColorSchemeChange = (event: SelectChangeEvent) => {
    setColorScheme(event.target.value);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar title="Settings" />
      
      <Box sx={{ 
        flexGrow: 1, 
        p: 3,
        overflowY: 'auto'
      }}>
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Global Rules" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Project Rules" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="System Preferences" id="tab-2" aria-controls="tabpanel-2" />
          </Tabs>
          
          {/* Global Rules Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h2" gutterBottom>
              Global Scheduling Rules
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <TextField
                id="max-hours-per-week"
                label="Maximum Hours Per Week"
                type="number"
                value={maxHoursPerWeek}
                onChange={(e) => setMaxHoursPerWeek(Number(e.target.value))}
                fullWidth
                sx={{ mb: 3 }}
              />
              
              <TextField
                id="default-working-hours"
                label="Default Working Hours"
                type="number"
                value={defaultWorkingHours}
                onChange={(e) => setDefaultWorkingHours(Number(e.target.value))}
                fullWidth
                sx={{ mb: 3 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    name="require-approval"
                    color="primary"
                  />
                }
                label="Require Approval for Leave Requests"
                sx={{ mb: 3 }}
              />
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Mandatory Days Off
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Set company holidays and other mandatory non-working days
              </Typography>
              
              <Button variant="outlined" color="primary">
                Add Holiday
              </Button>
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary">
                Save Changes
              </Button>
            </Box>
          </TabPanel>
          
          {/* Project Rules Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h2" gutterBottom>
              Project-Specific Rules
            </Typography>
            
            <Typography variant="body1" paragraph>
              Select a project to configure its specific rules.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel id="project-select-label">Select Project</InputLabel>
              <Select
                labelId="project-select-label"
                id="project-select"
                label="Select Project"
                value=""
                sx={{ mb: 3 }}
              >
                <MenuItem value="proj1">Project Alpha</MenuItem>
                <MenuItem value="proj2">Project Beta</MenuItem>
                <MenuItem value="proj3">Project Gamma</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 4 }}>
              Select a project from the dropdown to configure project-specific rules
            </Typography>
          </TabPanel>
          
          {/* System Preferences Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h2" gutterBottom>
              System Preferences
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="date-format-label">Date Format</InputLabel>
                <Select
                  labelId="date-format-label"
                  id="date-format"
                  value={dateFormat}
                  label="Date Format"
                  onChange={handleDateFormatChange}
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                id="fiscal-year-start"
                label="Fiscal Year Start (MM-DD)"
                placeholder="01-01"
                fullWidth
                sx={{ mb: 3 }}
              />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="color-scheme-label">Color Scheme</InputLabel>
                <Select
                  labelId="color-scheme-label"
                  id="color-scheme"
                  value={colorScheme}
                  label="Color Scheme"
                  onChange={handleColorSchemeChange}
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="highContrast">High Contrast</MenuItem>
                  <MenuItem value="colorblind">Colorblind Friendly</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" color="secondary">
                Reset to Defaults
              </Button>
              <Button variant="contained" color="primary">
                Save Preferences
              </Button>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default SettingsPage; 