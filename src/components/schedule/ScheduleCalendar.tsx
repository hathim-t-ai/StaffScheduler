import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Button,
  Checkbox,
  Tooltip
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { StaffMember } from '../../store/slices/staffSlice';
import { ScheduleTask } from '../../store/slices/scheduleSlice';
import CalendarCell from './CalendarCell';
import { formatDate, formatDateISO, hasAssignments } from '../../utils/ScheduleUtils';

interface ScheduleCalendarProps {
  filteredStaff: StaffMember[];
  tasks: ScheduleTask[];
  currentStartDate: Date;
  weekDates: Date[];
  onCellClick: (staffId: string, date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  isAtEndDate: boolean;
  dropTargetStaffId: string | null;
  dropTargetDate: string | null;
  onDragStart: (staffId: string, date: string) => void;
  onDragOver: (e: React.DragEvent, staffId: string, date: string) => void;
  onDrop: (e: React.DragEvent, staffId: string, date: string) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, staffId: string, date: string) => void;
  onBulkAssign: () => void;
  onWeeklyAssign: (staffId: string) => void;
  selectedStaffIds?: string[];
  onStaffSelect?: (staffId: string, checked: boolean) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  filteredStaff,
  tasks,
  currentStartDate,
  weekDates,
  onCellClick,
  onPreviousWeek,
  onNextWeek,
  isAtEndDate,
  dropTargetStaffId,
  dropTargetDate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onContextMenu,
  onBulkAssign,
  onWeeklyAssign,
  selectedStaffIds = [],
  onStaffSelect,
}) => {
  // Format date labels for display
  const dateLabels = weekDates.map(date => formatDate(date));
  
  // ISO date strings for each day in the week
  const isoDateStrings = weekDates.map(date => formatDateISO(date));

  return (
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
        <Typography variant="h6">
          Week of {formatDate(currentStartDate)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<PeopleIcon />}
            onClick={onBulkAssign}
            sx={{ mr: 2 }}
          >
            Bulk Assign
          </Button>
          <IconButton color="primary" onClick={onPreviousWeek}>
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton 
            color="primary" 
            onClick={onNextWeek}
            disabled={isAtEndDate}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3, bgcolor: 'common.white' }}>
        {/* Calendar header */}
        <Grid container>
          <Grid item xs={2.5} sx={{ p: 1, borderRight: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="bold">Staff</Typography>
          </Grid>
          {dateLabels.map((day, index) => (
            <Grid key={index} item xs={1.9} sx={{ p: 1, textAlign: 'center', borderRight: index < 4 ? 1 : 0, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight="bold">{weekDates[index].toLocaleDateString('en-US', { weekday: 'short' })}</Typography>
              <Typography variant="caption">{day}</Typography>
            </Grid>
          ))}
        </Grid>
        
        {/* Calendar body */}
        {filteredStaff.map((staff) => (
          <Grid container key={staff.id}>
            <Grid item xs={2.5} sx={{ p: 1, borderRight: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {onStaffSelect && (
                  <Checkbox
                    checked={selectedStaffIds.includes(staff.id)}
                    onChange={e => onStaffSelect(staff.id, e.target.checked)}
                    sx={{ mr: 1 }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1 }}>
                  <Typography variant="body2">{staff.name}</Typography>
                  <Tooltip title="Weekly Assignment">
                    <IconButton size="small" onClick={() => onWeeklyAssign(staff.id)}>
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="caption" component="div" color="textSecondary">{staff.grade}</Typography>
              <Typography variant="caption" component="div" color="textSecondary">{staff.department}</Typography>
            </Grid>
            {isoDateStrings.map((date, index) => (
              <CalendarCell
                key={`${staff.id}-${date}`}
                staffId={staff.id}
                date={date}
                dateIndex={index}
                weekDates={weekDates}
                tasks={tasks}
                isDropTarget={dropTargetStaffId === staff.id && dropTargetDate === date}
                hasAssignments={hasAssignments(staff.id, date, tasks)}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onContextMenu={onContextMenu}
                onCellClick={onCellClick}
              />
            ))}
          </Grid>
        ))}
      </Paper>
      
      <Typography variant="body2" color="textSecondary">
        Color Legend:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mt: 1 }}>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#FFFDE7', mr: 1 }}></Box>
          <Typography variant="body2">0-2 hours</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#FFF9C4', mr: 1 }}></Box>
          <Typography variant="body2">2-4 hours</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#FFF59D', mr: 1 }}></Box>
          <Typography variant="body2">4-6 hours</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#FFE082', mr: 1 }}></Box>
          <Typography variant="body2">6-7 hours</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#FFA000', mr: 1 }}></Box>
          <Typography variant="body2">8 hours</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#A5D6A7', mr: 1 }}></Box>
          <Typography variant="body2">Available</Typography>
        </Box>
        <Box sx={{ mr: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#E0E0E0', mr: 1 }}></Box>
          <Typography variant="body2">Leave</Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        Tip: Drag and drop to copy assignments. Right-click for more options.
      </Typography>
    </Box>
  );
};

export default ScheduleCalendar; 