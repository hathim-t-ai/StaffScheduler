import React, { useState } from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';

interface SidebarProps {
  /** Currently selected tab index: 0=People, 1=Projects */
  selected: number;
  /** Callback when a tab is selected */
  onSelect: (index: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selected, onSelect }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Box
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      sx={theme => ({
        width: collapsed ? theme.spacing(7) : theme.spacing(25),
        height: '100%',
        bgcolor: theme.palette.background.paper,
        color: theme.palette.common.white,
        boxShadow: theme.shadows[1],
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s',
        overflow: 'hidden',
      })}
    >
      <List disablePadding sx={{ mt: collapsed ? 2 : 0 }}>
        <ListItemButton
          selected={selected === 0}
          onClick={() => onSelect(0)}
          sx={{
            color: 'common.white',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-start',
            px: 2,
          }}
        >
          <ListItemIcon sx={{ justifyContent: 'center', minWidth: 0, mr: collapsed ? 0 : 2, color: 'inherit' }}>
            <PersonAddIcon />
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary="People"
              primaryTypographyProps={{ sx: { color: 'common.white' } }}
            />
          )}
        </ListItemButton>
        <ListItemButton
          selected={selected === 1}
          onClick={() => onSelect(1)}
          sx={{
            color: 'common.white',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-start',
            px: 2,
          }}
        >
          <ListItemIcon sx={{ justifyContent: 'center', minWidth: 0, mr: collapsed ? 0 : 2, color: 'inherit' }}>
            <BusinessCenterIcon />
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary="Projects"
              primaryTypographyProps={{ sx: { color: 'common.white' } }}
            />
          )}
        </ListItemButton>
      </List>
    </Box>
  );
};

export default Sidebar; 