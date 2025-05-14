import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ClearIcon from '@mui/icons-material/Clear';

interface ContextMenuPosition {
  mouseX: number;
  mouseY: number;
  staffId: string;
  date: string;
}

interface ScheduleContextMenuProps {
  contextMenu: ContextMenuPosition | null;
  onClose: () => void;
  onCopyDay: () => void;
  onPasteDay: () => void;
  onClearDay: () => void;
  canPaste: boolean;
}

const ScheduleContextMenu: React.FC<ScheduleContextMenuProps> = ({
  contextMenu,
  onClose,
  onCopyDay,
  onPasteDay,
  onClearDay,
  canPaste
}) => {
  return (
    <Menu
      open={contextMenu !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
    >
      <MenuItem onClick={onCopyDay}>
        <ListItemIcon>
          <ContentCopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy Day</ListItemText>
      </MenuItem>
      {canPaste && (
        <MenuItem onClick={onPasteDay}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Paste Day</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={onClearDay}>
        <ListItemIcon>
          <ClearIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Clear Day</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ScheduleContextMenu; 