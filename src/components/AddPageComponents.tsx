import React from 'react';
import { Box } from '@mui/material';

/**
 * Props for the TabPanel component
 * @interface TabPanelProps
 * @property {React.ReactNode} children - Content to be rendered in the tab panel
 * @property {number} index - Index of this tab panel
 * @property {number} value - Currently selected tab index
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * TabPanel Component
 * 
 * Renders content for a specific tab based on the current selected tab value.
 * Content is only rendered when the tab is active (value === index).
 */
export const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
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