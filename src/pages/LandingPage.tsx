import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  IconButton, 
  Box,
  useTheme
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventIcon from '@mui/icons-material/Event';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const navItems = [
    {
      title: 'Add',
      description: 'Add and manage staff and project data',
      icon: <PersonAddIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      path: '/add'
    },
    {
      title: 'Schedule',
      description: 'Allocate staff to projects and manage time off',
      icon: <EventIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      path: '/schedule'
    },
    {
      title: 'Analytics',
      description: 'View resource utilization and project performance',
      icon: <BarChartIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      path: '/analytics'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: theme.palette.background.paper,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          px: 2,
          zIndex: 1
        }}
      >
        <IconButton
          aria-label="settings"
          color="primary"
          onClick={() => navigate('/settings')}
          size="large"
        >
          <SettingsIcon />
        </IconButton>
      </Box>
      
      <Box 
        sx={{ 
          position: 'absolute', 
          bottom: 16, 
          right: 16 
        }}
      >
        <IconButton 
          aria-label="chat" 
          color="primary" 
          disabled
          size="large"
        >
          <ChatIcon />
        </IconButton>
      </Box>
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          flexGrow: 1
        }}
      >
        <Typography variant="h1" component="h1" gutterBottom align="center" sx={{ mb: 6, color: theme.palette.primary.main }}>
          Staff Scheduler
        </Typography>
        
        <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 1200 }}>
          {navItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                sx={{ 
                  backgroundColor: theme.palette.background.paper,
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                    cursor: 'pointer'
                  }
                }} 
                onClick={() => navigate(item.path)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h2" component="h2" gutterBottom sx={{ color: theme.palette.common.white }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.common.white }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default LandingPage; 