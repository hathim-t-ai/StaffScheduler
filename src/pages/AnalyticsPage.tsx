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
  ListItemSecondaryAction,
  Button
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { parseISO, subDays, startOfMonth, endOfMonth, isWithinInterval, addDays, addMonths, format } from 'date-fns';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'overall'>('overall');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const displayStartDate = useMemo(() => format(parseISO(startDate), 'dd/MM/yyyy'), [startDate]);

  const staffCount = useSelector((state: RootState) => state.staff.staffMembers.length);
  const projectCount = useSelector((state: RootState) => state.projects.projects.length);
  const tasks = useSelector((state: RootState) => state.schedule.tasks);
  const staffMembers = useSelector((state: RootState) => state.staff.staffMembers);
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);
  const projects = useSelector((state: RootState) => state.projects.projects);

  const filteredTasks = useMemo(() => {
    if (timeframe === 'weekly') {
      const start = parseISO(startDate);
      const end = addDays(start, 6);
      return tasks.filter((t) =>
        isWithinInterval(parseISO(t.date), { start, end })
      );
    }
    if (timeframe === 'monthly') {
      const start = parseISO(startDate);
      const end = addMonths(start, 1);
      return tasks.filter((t) =>
        isWithinInterval(parseISO(t.date), { start, end })
      );
    }
    return tasks;
  }, [tasks, timeframe, startDate]);

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

  const projectBudgets = useMemo(() =>
    projects.map((p) => {
      const consumed = filteredTasks.filter((t) => t.projectId === p.id).reduce((sum, t) => {
        const staff = staffMembers.find((s) => s.id === t.staffId);
        return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
      }, 0);
      return {
        id: p.id,
        name: p.name,
        client: p.partnerName || '',
        avatar: p.avatarUrl || '',
        consumed,
      };
    })
    .sort((a, b) => b.consumed - a.consumed),
    [projects, staffMembers, gradeRates, filteredTasks]
  );

  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Analytics" />
      <Box sx={{ p: 3, bgcolor: 'background.default' }}>

        {/* Timeframe Filters */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
          {/* Generate PDF Report Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              const rangeFrom = timeframe === 'overall' ? '' : startDate;
              const rangeTo = timeframe === 'overall' ? '' : (() => {
                const start = new Date(startDate);
                return timeframe === 'weekly'
                  ? format(addDays(start, 6), 'yyyy-MM-dd')
                  : format(addMonths(start, 1), 'yyyy-MM-dd');
              })();
              try {
                const response = await axios.post(
                  '/api/report',
                  { from: startDate, to: rangeTo || startDate },
                  { responseType: 'blob' }
                );
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `schedule_${startDate}_to_${rangeTo || startDate}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (err) {
                console.error('Failed to generate report:', err);
              }
            }}
            sx={{ ml: 2 }}
          >
            Generate Report
          </Button>
          {['weekly', 'monthly', 'overall'].map((key) => (
            <Button
              key={key}
              onClick={() => setTimeframe(key as typeof timeframe)}
              sx={{
                bgcolor: '#fff',
                color: '#212121',
                border: timeframe === key ? '2px solid #212121' : '1px solid #bdbdbd',
                borderRadius: 2,
                fontWeight: timeframe === key ? 700 : 400,
                minWidth: 120,
                textTransform: 'none',
                fontSize: 16,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  bgcolor: '#fafafa',
                  border: '2px solid #212121',
                },
              }}
              disableElevation
              variant="outlined"
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
          {timeframe !== 'overall' && (
            <Button
              component="label"
              sx={{
                position: 'relative',
                bgcolor: '#fff',
                color: '#212121',
                border: '1px solid #bdbdbd',
                borderRadius: 2,
                fontWeight: 400,
                minWidth: 120,
                textTransform: 'none',
                fontSize: 16,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                height: 48,
                '&:hover': { bgcolor: '#fafafa', border: '2px solid #212121' },
              }}
              disableElevation
              variant="outlined"
            >
              {displayStartDate}
              <CalendarTodayIcon fontSize="small" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 1
                }}
              />
            </Button>
          )}
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
                {productiveHours.toLocaleString()} hrs
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
                {expectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3}>
          {/* Productive Hours per Employee */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Productive Hours per Employee
              </Typography>
              <Box sx={{ mt: 4, height: 220, overflowX: 'auto' }}>
                <div style={{ width: staffMembers.length * 80 }}>
                  <Bar
                    data={{
                      ...employeeChartData,
                      datasets: [{
                        ...employeeChartData.datasets[0],
                        backgroundColor: '#212121',
                        borderRadius: 8,
                        barPercentage: 0.7,
                        categoryPercentage: 0.7,
                      }]
                    }}
                    options={{
                      maintainAspectRatio: false,
                      layout: { padding: { top: 40 } },
                      plugins: {
                        legend: { display: false },
                        datalabels: {
                          anchor: 'end',
                          align: 'end',
                          clamp: true,
                          color: '#212121',
                          font: { weight: 'bold', size: 16 },
                          formatter: (v: number) => v.toLocaleString(),
                        },
                        tooltip: { enabled: true },
                      } as any,
                      scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, grid: { color: '#f0f0f0' } }
                      }
                    }}
                    plugins={[ChartDataLabels]}
                  />
                </div>
              </Box>
            </Paper>
          </Grid>
          {/* Budget Consumption per Project - Recent Sales Style */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 300 }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Budget Consumption per Project
              </Typography>
              <Box sx={{ height: 220, overflowY: 'auto' }}>
                <List>
                  {projectBudgets.map((proj) => (
                    <ListItem key={proj.id} sx={{ py: 2, borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={<Typography fontWeight={600}>{proj.name}</Typography>}
                        secondary={proj.client && <Typography variant="body2" color="textSecondary">{proj.client}</Typography>}
                      />
                      <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                        <Typography fontWeight={700} color="textPrimary" sx={{ fontSize: 18 }}>
                          {proj.consumed.toLocaleString()}<span style={{ color: '#bdbdbd', fontWeight: 400, fontSize: 15 }}>/{(projects.find(p => p.id === proj.id)?.budget || 0).toLocaleString()}</span> AED
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Paper>
          </Grid>
        </Grid>

      </Box>
    </Container>
  );
};

export default AnalyticsPage; 