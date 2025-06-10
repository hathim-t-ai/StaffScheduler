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
import { useSelector, useDispatch } from 'react-redux';

import NavigationBar from '../components/NavigationBar';
import { RootState } from '../store';
import { updateGlobalRules, updateEmailSettings } from '../store/slices/settingsSlice';
import { useEmailSettings } from '../hooks/useEmailSettings';

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
  const dispatch = useDispatch();
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);
  const emailSettings = useSelector((state: RootState) => state.settings.emailSettings || {
    enabled: false,
    reminderDay: 'thursday' as const,
    reminderTime: '14:00',
    fromEmail: 'hathimamirb@gmail.com',
    thresholdHours: 40
  });
  const { updateSettings: updateEmailSettingsHook } = useEmailSettings();
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

  const handleSaveEmailSettings = async () => {
    try {
      await updateEmailSettingsHook(emailSettings);
      // Could add a success notification here
      console.log('Email settings saved successfully');
    } catch (error) {
      console.error('Failed to save email settings:', error);
      // Could add an error notification here
    }
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar title="Settings" />
      
      <Box sx={{
        flexGrow: 1,
        overflow: 'auto',
        bgcolor: 'background.default',
        pt: 2,
        px: 2
      }}>
        <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden', bgcolor: 'common.white' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Global Rules" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Project Rules" id="tab-1" aria-controls="tabpanel-1" />
            <Tab label="System Preferences" id="tab-2" aria-controls="tabpanel-2" />
            <Tab label="Email Settings" id="tab-3" aria-controls="tabpanel-3" />
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
            
            {/* Grade Rates Section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Grade Rates (AED per hour)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {Object.entries(gradeRates).map(([grade, rate]) => (
                <TextField
                  key={grade}
                  label={grade}
                  type="number"
                  value={rate}
                  onChange={(e) => dispatch(updateGlobalRules({ gradeRates: { ...gradeRates, [grade]: Number(e.target.value) } }))}
                  sx={{ width: '200px' }}
                />
              ))}
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
          
          {/* Email Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h2" gutterBottom>
              Email Settings
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailSettings.enabled}
                    onChange={(e) => dispatch(updateEmailSettings({ enabled: e.target.checked }))}
                    name="emailEnabled"
                    color="primary"
                  />
                }
                label="Enable Email Reminders"
                sx={{ mb: 3 }}
              />
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Automatic Reminder Schedule
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Configure when automatic email reminders should be sent to staff with incomplete schedules
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="reminder-day-label">Reminder Day</InputLabel>
                <Select
                  labelId="reminder-day-label"
                  id="reminder-day"
                  value={emailSettings.reminderDay}
                  label="Reminder Day"
                  onChange={(e) => dispatch(updateEmailSettings({ reminderDay: e.target.value as any }))}
                >
                  <MenuItem value="monday">Monday</MenuItem>
                  <MenuItem value="tuesday">Tuesday</MenuItem>
                  <MenuItem value="wednesday">Wednesday</MenuItem>
                  <MenuItem value="thursday">Thursday</MenuItem>
                  <MenuItem value="friday">Friday</MenuItem>
                  <MenuItem value="saturday">Saturday</MenuItem>
                  <MenuItem value="sunday">Sunday</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                id="reminder-time"
                label="Reminder Time"
                type="time"
                value={emailSettings.reminderTime}
                onChange={(e) => dispatch(updateEmailSettings({ reminderTime: e.target.value }))}
                fullWidth
                sx={{ mb: 3 }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  step: 300, // 5 min
                }}
                helperText="Time in 24-hour format (e.g., 14:00 for 2:00 PM)"
              />
              
              <TextField
                id="threshold-hours"
                label="Minimum Required Hours"
                type="number"
                value={emailSettings.thresholdHours}
                onChange={(e) => dispatch(updateEmailSettings({ thresholdHours: Number(e.target.value) }))}
                fullWidth
                sx={{ mb: 3 }}
                helperText="Staff with fewer than this many hours scheduled will receive reminders"
              />
              
              <TextField
                id="from-email"
                label="From Email Address"
                type="email"
                value={emailSettings.fromEmail}
                onChange={(e) => dispatch(updateEmailSettings({ fromEmail: e.target.value }))}
                fullWidth
                sx={{ mb: 3 }}
                helperText="The email address that reminders will be sent from"
              />
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Preview
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Automatic reminders will be sent every {emailSettings.reminderDay} at {emailSettings.reminderTime} to staff with less than {emailSettings.thresholdHours} hours scheduled for the following week.
              </Typography>
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary" onClick={handleSaveEmailSettings}>
                Save Email Settings
              </Button>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default SettingsPage; 