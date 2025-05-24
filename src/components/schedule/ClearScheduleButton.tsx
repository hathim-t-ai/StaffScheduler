import axios from 'axios';
import { startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { clearSchedule } from '../../store/slices/scheduleSlice';
import Button from '@mui/material/Button';     // adjust if you use another UI lib

/**
 * Clears all assignments for the week currently shown in the calendar.
 */
export default function ClearScheduleButton() {
  /* ─────────────────────────────────── state helpers ── */
  const dispatch = useDispatch();

  // <ScheduleCalendar> keeps the Monday date in Redux; adapt the selector if needed
  const weekStartIso = useSelector((s: RootState) => s.schedule.startDate);
  const weekStart = parseISO(weekStartIso);

  const from = startOfWeek(weekStart, { weekStartsOn: 1 });
  const to   = endOfWeek  (weekStart, { weekStartsOn: 1 });

  /* ─────────────────────────────────── click handler ── */
  const handleClick = async () => {
    try {
      /* 1 ▪ hit the server */
      await axios.delete('/api/assignments/range', {
        data: { from, to }                // add projectId / staffIds if you like
      });

      /* 2 ▪ purge the rows locally → instant UI update */
      dispatch(clearSchedule());

      /* 3 ▪ toast / message back to the user (optional) */
      dispatch({
        type : 'chat/add',
        payload : {
          role : 'assistant',
          text : '🗑️ Cleared schedule for this week.'
        }
      });
    } catch (err) {
      console.error(err);
      alert('Could not clear schedule');
    }
  };

  return (
    <Button variant="outlined" size="small" onClick={handleClick}>
      Clear schedule
    </Button>
  );
}