import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';

const SchedulingPage: React.FC = () => {
  // Mock data for staff members
  const staffMembers = [
    { id: 1, name: 'John Doe', department: 'Engineering' },
    { id: 2, name: 'Jane Smith', department: 'Design' },
    { id: 3, name: 'Robert Johnson', department: 'Marketing' },
    { id: 4, name: 'Sarah Williams', department: 'HR' },
    { id: 5, name: 'Michael Brown', department: 'Finance' },
  ];

  // Mock data for days of the week
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  
  // State for selected staff member
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar title="Schedule" />
      
      <Box sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 64px)'
      }}>
        {/* Left sidebar with staff list */}
        <Box sx={{
          width: { xs: '30%', md: '20%' },
          minWidth: { md: '250px' },
          borderRight: 1,
          borderColor: 'divider',
          overflowY: 'auto'
        }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            Staff Members
          </Typography>
          
          <List>
            {staffMembers.map((staff) => (
              <ListItem 
                key={staff.id}
                disablePadding
                divider
                selected={selectedStaff === staff.id}
              >
                <ListItemButton
                  onClick={() => setSelectedStaff(staff.id)}
                >
                  <ListItemText 
                    primary={staff.name} 
                    secondary={staff.department}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        
        {/* Calendar view */}
        <Box sx={{ 
          flexGrow: 1, 
          p: 2,
          overflowY: 'auto'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h2">Week of May 13, 2025</Typography>
            <Box>
              <IconButton color="primary">
                <NavigateBeforeIcon />
              </IconButton>
              <IconButton color="primary">
                <NavigateNextIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Paper sx={{ mb: 3 }}>
            {/* Calendar header */}
            <Grid container>
              <Grid item xs={3} sx={{ p: 1, borderRight: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight="bold">Staff</Typography>
              </Grid>
              {daysOfWeek.map((day, index) => (
                <Grid key={index} item xs={1.8} sx={{ p: 1, textAlign: 'center', borderRight: index < 4 ? 1 : 0, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight="bold">{day}</Typography>
                </Grid>
              ))}
            </Grid>
            
            {/* Calendar body */}
            {staffMembers.map((staff) => (
              <Grid container key={staff.id}>
                <Grid item xs={3} sx={{ p: 1, borderRight: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="body1">{staff.name}</Typography>
                </Grid>
                {daysOfWeek.map((day, index) => (
                  <Grid 
                    key={index} 
                    item 
                    xs={1.8} 
                    sx={{ 
                      p: 1, 
                      textAlign: 'center', 
                      borderRight: index < 4 ? 1 : 0, 
                      borderBottom: 1, 
                      borderColor: 'divider',
                      height: '80px',
                      backgroundColor: '#FFFDE7', // Lightest yellow for 0-2 hours booked
                      position: 'relative'
                    }}
                  >
                    <Tooltip title="Add task assignment">
                      <IconButton 
                        size="small" 
                        sx={{ 
                          position: 'absolute', 
                          top: 4, 
                          right: 4,
                          backgroundColor: 'rgba(255,255,255,0.7)'
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            ))}
          </Paper>
          
          <Typography variant="body2" color="textSecondary">
            Color Legend:
          </Typography>
          <Box sx={{ display: 'flex', mt: 1 }}>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: '#FFFDE7', mr: 1 }}></Box>
              <Typography variant="body2">0-2 hours</Typography>
            </Box>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: '#FFF9C4', mr: 1 }}></Box>
              <Typography variant="body2">2-4 hours</Typography>
            </Box>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: '#FFF59D', mr: 1 }}></Box>
              <Typography variant="body2">4-6 hours</Typography>
            </Box>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: '#FFE082', mr: 1 }}></Box>
              <Typography variant="body2">6-7 hours</Typography>
            </Box>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, backgroundColor: '#FFA000', mr: 1 }}></Box>
              <Typography variant="body2">8 hours</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default SchedulingPage; 