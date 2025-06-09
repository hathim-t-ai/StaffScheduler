import React from 'react';

import BarChartIcon from '@mui/icons-material/BarChart';
import EventIcon from '@mui/icons-material/Event';
import HomeIcon from '@mui/icons-material/Home';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface NavigationBarProps {
  title: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ title }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Navigation items with icons and paths
  const navItems = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    { label: 'Add', icon: <PersonAddIcon />, path: '/add' },
    { label: 'Schedule', icon: <EventIcon />, path: '/schedule' },
    { label: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
  ];

  return (
    <AppBar position="static" sx={{ backgroundColor: theme.palette.background.paper }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex' }}>
          {navItems.map((item, index) => (
            isMobile ? (
              <IconButton
                key={index}
                color="inherit"
                aria-label={item.label}
                onClick={() => navigate(item.path)}
                sx={{ mx: 0.5 }}
              >
                {item.icon}
              </IconButton>
            ) : (
              <Button
                key={index}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{ mx: 1 }}
              >
                {item.label}
              </Button>
            )
          ))}
          
          <IconButton
            color="inherit"
            aria-label="settings"
            onClick={() => navigate('/settings')}
            sx={{ ml: isMobile ? 0.5 : 1 }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar; 