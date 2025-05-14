import React from 'react';
import { Grid, IconButton, Typography, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ScheduleTask } from '../../store/slices/scheduleSlice';
import { getBackgroundColor, getTaskText } from '../../utils/ScheduleUtils';

interface CalendarCellProps {
  staffId: string;
  date: string;
  dateIndex: number;
  weekDates: Date[];
  tasks: ScheduleTask[];
  isDropTarget?: boolean;
  hasAssignments: boolean;
  onDragStart: (staffId: string, date: string) => void;
  onDragOver: (e: React.DragEvent, staffId: string, date: string) => void;
  onDrop: (e: React.DragEvent, staffId: string, date: string) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, staffId: string, date: string) => void;
  onCellClick: (staffId: string, date: Date) => void;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  staffId,
  date,
  dateIndex,
  weekDates,
  tasks,
  isDropTarget = false,
  hasAssignments,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onContextMenu,
  onCellClick
}) => {
  // Get tasks for this cell
  const cellTasks = tasks.filter(
    task => task.staffId === staffId && task.date === date
  );
  
  // Get background color and task text
  const bgColor = getBackgroundColor(cellTasks);
  const taskText = getTaskText(cellTasks);
  
  return (
    <Grid 
      item 
      xs={1.8}
      sx={{ 
        height: '100px', 
        p: 1, 
        position: 'relative',
        borderRight: dateIndex < 4 ? 1 : 0, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: isDropTarget ? 'rgba(33, 150, 243, 0.2)' : bgColor,
        transition: 'background-color 0.2s',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isDropTarget 
            ? 'rgba(33, 150, 243, 0.3)' 
            : `${bgColor === '#FFFFFF' ? '#F5F5F5' : bgColor}`
        }
      }}
      onContextMenu={(e) => onContextMenu(e, staffId, date)}
      onClick={() => onCellClick(staffId, weekDates[dateIndex])}
      draggable={hasAssignments}
      onDragStart={() => onDragStart(staffId, date)}
      onDragOver={(e) => onDragOver(e, staffId, date)}
      onDrop={(e) => onDrop(e, staffId, date)}
      onDragEnd={onDragEnd}
    >
      <Typography 
        variant="body2" 
        sx={{ 
          whiteSpace: 'pre-line',
          fontSize: '0.75rem'
        }}
      >
        {taskText}
      </Typography>
      
      <Tooltip title="Add task assignment">
        <IconButton 
          size="small" 
          sx={{ 
            position: 'absolute', 
            top: 4, 
            right: 4,
            backgroundColor: 'rgba(255,255,255,0.7)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onCellClick(staffId, weekDates[dateIndex]);
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Grid>
  );
};

export default CalendarCell; 