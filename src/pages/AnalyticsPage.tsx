import React, { useState, useMemo } from 'react';
import {
  Container,
  Box,
  Grid,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'overall'>('overall');
  const handleTimeframeChange = (_event: React.MouseEvent<HTMLElement>, newValue: 'weekly' | 'monthly' | 'overall' | null) => {
    if (newValue) setTimeframe(newValue);
  };

  const staffCount = useSelector((state: RootState) => state.staff.staffMembers.length);
  const projectCount = useSelector((state: RootState) => state.projects.projects.length);
  const tasks = useSelector((state: RootState) => state.schedule.tasks);
  const staffMembers = useSelector((state: RootState) => state.staff.staffMembers);
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);
  const projects = useSelector((state: RootState) => state.projects.projects);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    if (timeframe === 'weekly') {
      const weekAgo = subDays(now, 6);
      return tasks.filter((t) => isWithinInterval(parseISO(t.date), { start: weekAgo, end: now }));
    }
    if (timeframe === 'monthly') {
      return tasks.filter((t) => isWithinInterval(parseISO(t.date), { start: startOfMonth(now), end: endOfMonth(now) }));
    }
    return tasks;
  }, [tasks, timeframe]);

  const productiveTasks = useMemo(
    () => filteredTasks.filter((t) => t.projectId && !['Available', 'Annual Leave', 'Sick Leave'].includes(t.taskType)),
    [filteredTasks]
  );

  const productiveHours = useMemo(() => productiveTasks.reduce((sum, t) => sum + t.hours, 0), [productiveTasks]);
  const expectedRevenue = useMemo(
    () => productiveTasks.reduce((sum, t) => {
      const staff = staffMembers.find((s) => s.id === t.staffId);
      return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
    }, 0),
    [productiveTasks, staffMembers, gradeRates]
  );

  const employeeChartData = useMemo(() => ({
    labels: staffMembers.map((s) => s.name),
    datasets: [
      {
        label: 'Productive Hours',
        data: staffMembers.map((s) =>
          filteredTasks.filter((t) => t.staffId === s.id && t.projectId).reduce((sum, t) => sum + t.hours, 0)
        ),
        backgroundColor: 'rgba(75,192,192,0.6)'
      }
    ]
  }), [staffMembers, filteredTasks]);

  const projectChartData = useMemo(() => ({
    labels: projects.map((p) => p.name),
    datasets: [
      {
        label: 'Budget Consumed',
        data: projects.map((p) =>
          filteredTasks.filter((t) => t.projectId === p.id).reduce((sum, t) => {
            const staff = staffMembers.find((s) => s.id === t.staffId);
            return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
          }, 0)
        ),
        backgroundColor: 'rgba(153,102,255,0.6)'
      }
    ]
  }), [projects, staffMembers, gradeRates, filteredTasks]);

  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Analytics" />
      <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>

        {/* Timeframe Filters */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <ToggleButtonGroup value={timeframe} exclusive onChange={handleTimeframeChange} size="small">
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="overall">Overall</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Top metrics cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Employees Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
              <Typography variant="subtitle2" color="textPrimary">
                Total Employees
              </Typography>
              <Typography variant="h5" color="textPrimary" sx={{ mt: 1 }}>
                {staffCount}
              </Typography>
            </Paper>
          </Grid>

          {/* Projects Count */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
              <Typography variant="subtitle2" color="textPrimary">
                Total Projects
              </Typography>
              <Typography variant="h5" color="textPrimary" sx={{ mt: 1 }}>
                {projectCount}
              </Typography>
            </Paper>
          </Grid>

          {/* Productive Hours */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
              <Typography variant="subtitle2" color="textPrimary">
                Productive Hours
              </Typography>
              <Typography variant="h5" color="textPrimary" sx={{ mt: 1 }}>
                {productiveHours} hrs
              </Typography>
            </Paper>
          </Grid>

          {/* Expected Revenue */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
              <Typography variant="subtitle2" color="textPrimary">
                Expected Revenue
              </Typography>
              <Typography variant="h5" color="textPrimary" sx={{ mt: 1 }}>
                {expectedRevenue.toFixed(2)} AED
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3}>
          {/* Productive Hours per Employee */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: '100%' }} elevation={1}>
              <Typography variant="h6" color="textPrimary">
                Productive Hours per Employee
              </Typography>
              <Box sx={{ mt: 2, height: 350, overflowX: 'auto' }}>
                <div style={{ width: staffMembers.length * 80 }}>
                  <Bar
                    data={employeeChartData}
                    options={{
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true } }
                    }}
                  />
                </div>
              </Box>
            </Paper>
          </Grid>
          {/* Budget Consumption per Project */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: '100%' }} elevation={1}>
              <Typography variant="h6" color="textPrimary">
                Budget Consumption per Project
              </Typography>
              <Box sx={{ mt: 2, height: 350, overflowX: 'auto' }}>
                <div style={{ width: projects.length * 80 }}>
                  <Bar
                    data={projectChartData}
                    options={{
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true } }
                    }}
                  />
                </div>
              </Box>
            </Paper>
          </Grid>
        </Grid>

      </Box>
    </Container>
  );
};

export default AnalyticsPage; 