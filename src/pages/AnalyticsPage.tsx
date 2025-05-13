import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  IconButton
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/Edit';

const AnalyticsPage: React.FC = () => {
  // Mock state for filters
  const [timeframe, setTimeframe] = useState('week');
  
  const handleTimeframeChange = (event: SelectChangeEvent) => {
    setTimeframe(event.target.value);
  };

  // Dashboard widgets configuration
  const widgets = [
    {
      id: 1,
      title: 'Resource Utilization',
      description: 'Overall resource utilization across departments',
      height: 300,
    },
    {
      id: 2,
      title: 'Project Allocation',
      description: 'Staff allocation by project',
      height: 300,
    },
    {
      id: 3,
      title: 'Availability Forecast',
      description: 'Projected staff availability for next 3 months',
      height: 300,
    },
    {
      id: 4,
      title: 'Leave Patterns',
      description: 'Upcoming leave and availability status',
      height: 250,
    },
    {
      id: 5,
      title: 'Skill Utilization',
      description: 'Utilization breakdown by skill set',
      height: 250,
    },
  ];

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar title="Analytics" />
      
      <Box sx={{ 
        flexGrow: 1, 
        p: 3,
        overflowY: 'auto'
      }}>
        {/* Filter controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h2" gutterBottom>
            Analytics Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="timeframe-select-label">Timeframe</InputLabel>
              <Select
                labelId="timeframe-select-label"
                id="timeframe-select"
                value={timeframe}
                label="Timeframe"
                onChange={handleTimeframeChange}
                size="small"
              >
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
                <MenuItem value="quarter">Quarterly</MenuItem>
              </Select>
            </FormControl>
            
            <IconButton 
              color="primary"
              aria-label="Edit dashboard"
              sx={{ ml: 1 }}
            >
              <EditIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Dashboard widgets */}
        <Grid container spacing={3}>
          {widgets.map((widget) => (
            <Grid item xs={12} md={widget.id <= 3 ? 12 : 6} key={widget.id}>
              <Paper 
                sx={{ 
                  p: 2, 
                  height: widget.height,
                  display: 'flex',
                  flexDirection: 'column'
                }}
                elevation={2}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <div>
                    <Typography variant="h6" gutterBottom>
                      {widget.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {widget.description}
                    </Typography>
                  </div>
                  <IconButton 
                    size="small" 
                    aria-label="Export data"
                    title="Export data"
                  >
                    <FileDownloadIcon />
                  </IconButton>
                </Box>
                
                <Box 
                  sx={{ 
                    flexGrow: 1, 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <Typography variant="body1" color="textSecondary">
                    Chart visualization will be displayed here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default AnalyticsPage; 