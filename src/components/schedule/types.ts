import { ScheduleTask } from '../../store/slices/scheduleSlice';

// Type for drag operations
export interface DragItem {
  staffId: string;
  date: string;
  tasks: ScheduleTask[];
}

// Type for context menu position
export interface ContextMenuPosition {
  mouseX: number;
  mouseY: number;
  staffId: string;
  date: string;
}

// Type for notification
export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

// Type for staff hours in bulk assignment
export interface StaffHours {
  id: string;
  name: string;
  hours: number;
} 