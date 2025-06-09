/* eslint-disable import/no-duplicates */
import React, { useState, useMemo, useRef, useEffect } from 'react';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import {
  Container,
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { parseISO, isWithinInterval, addDays, addMonths, format, getDaysInMonth } from 'date-fns';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useSelector } from 'react-redux';

import NavigationBar from '../components/NavigationBar';
import { RootState } from '../store';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

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
      return tasks.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    }
    if (timeframe === 'monthly') {
      const start = parseISO(startDate);
      const end = addMonths(start, 1);
      return tasks.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    }
    return tasks;
  }, [tasks, timeframe, startDate]);

  const productiveTasks = useMemo(
    () =>
      filteredTasks.filter(
        t => t.projectId && !['Available', 'Annual Leave', 'Sick Leave'].includes(t.taskType)
      ),
    [filteredTasks]
  );

  const productiveHours = useMemo(
    () => productiveTasks.reduce((sum, t) => sum + t.hours, 0),
    [productiveTasks]
  );
  const expectedRevenue = useMemo(
    () =>
      productiveTasks.reduce((sum, t) => {
        const staff = staffMembers.find(s => s.id === t.staffId);
        return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
      }, 0),
    [productiveTasks, staffMembers, gradeRates]
  );

  const employeeChartData = useMemo(
    () => ({
      labels: staffMembers.map(s => s.name),
      datasets: [
        {
          label: 'Productive Hours',
          data: staffMembers.map(s =>
            filteredTasks
              .filter(t => t.staffId === s.id && t.projectId)
              .reduce((sum, t) => sum + t.hours, 0)
          ),
          backgroundColor: 'rgba(75,192,192,0.6)',
        },
      ],
    }),
    [staffMembers, filteredTasks]
  );

  // New Analytics Calculations

  // 1. Utilisation/Chargeability Analytics
  const chargeabilityData = useMemo(() => {
    const data: Record<string, { productive: number; total: number; chargeability: number }> = {};

    // Calculate total possible working hours based on timeframe
    let totalPossibleHours = 0;
    if (timeframe === 'weekly') {
      totalPossibleHours = 40; // 5 days × 8 hours
    } else if (timeframe === 'monthly') {
      const daysInCurrentMonth = getDaysInMonth(parseISO(startDate));
      // Assume ~22 working days per month (excluding weekends)
      const workingDaysInMonth = Math.floor((daysInCurrentMonth * 5) / 7);
      totalPossibleHours = workingDaysInMonth * 8;
    } else {
      // For overall timeframe, calculate based on full year
      // Assume 52 weeks × 40 hours = 2080 hours per year
      totalPossibleHours = 52 * 40;
    }

    staffMembers.forEach(staff => {
      const staffTasks = filteredTasks.filter(t => t.staffId === staff.id);
      const productiveHours = staffTasks
        .filter(
          t => t.projectId && !['Available', 'Annual Leave', 'Sick Leave'].includes(t.taskType)
        )
        .reduce((sum, t) => sum + t.hours, 0);

      // Calculate actual total hours taken by leave
      const leaveHours = staffTasks
        .filter(t => ['Annual Leave', 'Sick Leave'].includes(t.taskType))
        .reduce((sum, t) => sum + t.hours, 0);

      // Total available hours = total possible hours - leave hours
      const totalAvailableHours = totalPossibleHours - leaveHours;

      const chargeability = totalAvailableHours > 0 ? (productiveHours / totalAvailableHours) * 100 : 0;

      data[staff.name] = {
        productive: productiveHours,
        total: totalAvailableHours,
        chargeability,
      };
    });

    return data;
  }, [staffMembers, filteredTasks, timeframe, startDate]);

  // Helper function to generate gradient color from orange to green
  const getProgressColor = (percentage: number): string => {
    // Ensure percentage is between 0 and 100
    const normalizedPercentage = Math.max(0, Math.min(100, percentage));
    
    // Convert to 0-1 scale
    const ratio = normalizedPercentage / 100;
    
    // Orange: rgb(255, 152, 0) - #FF9800
    // Green: rgb(76, 175, 80) - #4CAF50
    const orangeRGB = { r: 255, g: 152, b: 0 };
    const greenRGB = { r: 76, g: 175, b: 80 };
    
    // Interpolate between orange and green
    const r = Math.round(orangeRGB.r + (greenRGB.r - orangeRGB.r) * ratio);
    const g = Math.round(orangeRGB.g + (greenRGB.g - orangeRGB.g) * ratio);
    const b = Math.round(orangeRGB.b + (greenRGB.b - orangeRGB.b) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 2. Budget Consumption Analytics
  const budgetAnalytics = useMemo(() => {
    return projects
      .map(project => {
        const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
        const consumed = projectTasks.reduce((sum, t) => {
          const staff = staffMembers.find(s => s.id === t.staffId);
          return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
        }, 0);

        const consumedPercentage = project.budget > 0 ? (consumed / project.budget) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          budget: project.budget,
          consumed,
          consumedPercentage,
          remaining: project.budget - consumed,
        };
      })
      .sort((a, b) => b.consumedPercentage - a.consumedPercentage);
  }, [projects, filteredTasks, staffMembers, gradeRates]);

  // 3. Forecast Cost at Completion (EAC)
  const forecastData = useMemo(() => {
    return projects.map(project => {
      const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
      const consumedToDate = projectTasks.reduce((sum, t) => {
        const staff = staffMembers.find(s => s.id === t.staffId);
        return sum + t.hours * (staff ? gradeRates[staff.grade] || 0 : 0);
      }, 0);

      let estimatedCompletion = consumedToDate;

      // Calculate forecast based on timeframe
      if (timeframe !== 'overall') {
        // Simple linear projection based on current burn rate
        const daysInPeriod = timeframe === 'weekly' ? 7 : getDaysInMonth(parseISO(startDate));
        const dailyBurnRate = consumedToDate / daysInPeriod;

        // Assume project duration based on budget and current burn rate
        const estimatedDaysToComplete =
          dailyBurnRate > 0 ? (project.budget - consumedToDate) / dailyBurnRate : 0;
        estimatedCompletion = consumedToDate + dailyBurnRate * estimatedDaysToComplete;
      } else {
        // For overall view, show simple completion estimate based on current consumption
        const consumptionRate = project.budget > 0 ? consumedToDate / project.budget : 0;
        estimatedCompletion = consumptionRate < 1 ? project.budget * 1.1 : consumedToDate;
      }

      return {
        id: project.id,
        name: project.name,
        budget: project.budget,
        consumedToDate,
        estimatedCompletion,
        variance: estimatedCompletion - project.budget,
        variancePercentage:
          project.budget > 0 ? ((estimatedCompletion - project.budget) / project.budget) * 100 : 0,
      };
    });
  }, [projects, filteredTasks, staffMembers, gradeRates, timeframe, startDate]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [shouldGenerate, setShouldGenerate] = useState(false);
  const handleGenerateReport = async () => {
    // Hide controls
    const controlsEl = document.getElementById('report-controls');
    if (controlsEl) controlsEl.style.display = 'none';
    if (!reportRef.current) return;
    // Capture entire analytics section at high resolution for crisp PDF
    const canvas = await html2canvas(reportRef.current, { 
      backgroundColor: '#212529', 
      scale: 2,
      useCORS: true,
      allowTaint: true
    });
    const imgData = canvas.toDataURL('image/png');
    // Prepare PDF
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const headerHeight = 40;
    const margin = 20;
    // Draw header bar
    const reportDate = format(parseISO(startDate), 'd MMMM yyyy');
    const period = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
    const fileName = `analytics_report_${startDate}_${period}.pdf`;
    pdf.setFillColor('#212529');
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    pdf.setFontSize(16);
    pdf.setTextColor('#ffffff');
    pdf.text(`Analytics Report - ${reportDate} - ${period}`, margin, headerHeight / 2 + 6);
    // Use most of the page height for the content (leaving space for header and margins)
    const contentHeight = pageHeight - headerHeight - 2 * margin;
    // Compute image scaling to fit the available page space below header
    const contentWidth = pageWidth - 2 * margin;
    const scale = Math.min(contentWidth / canvas.width, contentHeight / canvas.height);
    const imgWidth = canvas.width * scale;
    const imgHeight = canvas.height * scale;
    // Add image
    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = headerHeight + margin;
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
    // Save and restore
    pdf.save(fileName);
    if (controlsEl) controlsEl.style.display = '';
  };

  // Listen for chat-generated report requests (via global event)
  useEffect(() => {
    const handler = (e: any) => {
      const { startDate: sd, timeframe: tf } = e.detail;
      setStartDate(sd);
      setTimeframe(tf);
      setShouldGenerate(true);
    };
    window.addEventListener('generate-report', handler as EventListener);
    return () => window.removeEventListener('generate-report', handler as EventListener);
  }, []);

  // Handle report requests via URL params (from chat navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rs = params.get('reportStart');
    const tf = params.get('reportTimeframe');
    if (rs && tf && ['weekly', 'monthly', 'overall'].includes(tf)) {
      setStartDate(rs);
      setTimeframe(tf as 'weekly' | 'monthly' | 'overall');
      setShouldGenerate(true);
    }
  }, []);

  // Trigger PDF generation when flagged
  useEffect(() => {
    if (shouldGenerate) {
      handleGenerateReport();
      setShouldGenerate(false);
    }
  }, [shouldGenerate]);

  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Analytics" />
      <Box ref={reportRef} sx={{ p: 3, bgcolor: 'background.default' }}>
        {/* Timeframe Filters */}
        <Box
          id="report-controls"
          sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}
        >
          {/* Generate PDF Report Button */}
          <Button variant="contained" color="primary" onClick={handleGenerateReport} sx={{ ml: 2 }}>
            Generate Report
          </Button>
          {['weekly', 'monthly', 'overall'].map(key => (
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
                onChange={e => setStartDate(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 1,
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
                {expectedRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                AED
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Productive Hours per Employee */}
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 3,
                backgroundColor: '#ffffff',
                height: 300,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
              }}
              elevation={1}
            >
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Productive Hours per Employee
              </Typography>
              <Box sx={{ mt: 4, height: 220, overflowX: 'auto' }}>
                <div style={{ width: staffMembers.length * 80 }}>
                  <Bar
                    data={{
                      ...employeeChartData,
                      datasets: [
                        {
                          ...employeeChartData.datasets[0],
                          backgroundColor: '#212121',
                          borderRadius: 8,
                          barPercentage: 0.7,
                          categoryPercentage: 0.7,
                        },
                      ],
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
                        y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                      },
                    }}
                    plugins={[ChartDataLabels]}
                  />
                </div>
              </Box>
            </Paper>
          </Grid>

          {/* Overall Budget Status */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 300 }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Overall Budget Status
              </Typography>
              <Box
                sx={{
                  height: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ position: 'relative', width: 180, height: 180, mb: 2 }}>
                  <Doughnut
                    data={{
                      datasets: [
                        {
                          data: [
                            budgetAnalytics.reduce((sum, p) => sum + p.consumed, 0),
                            budgetAnalytics.reduce((sum, p) => sum + p.remaining, 0),
                          ],
                          backgroundColor: ['#212121', '#f0f0f0'],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        datalabels: { display: false },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h4" fontWeight={700} color="textPrimary">
                      {budgetAnalytics.reduce((sum, p) => sum + p.budget, 0) > 0
                        ? (
                            (budgetAnalytics.reduce((sum, p) => sum + p.consumed, 0) /
                              budgetAnalytics.reduce((sum, p) => sum + p.budget, 0)) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                      %
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Budget Used
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" fontWeight={600} color="textPrimary">
                    {budgetAnalytics.reduce((sum, p) => sum + p.consumed, 0).toLocaleString()} AED
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    of {budgetAnalytics.reduce((sum, p) => sum + p.budget, 0).toLocaleString()} AED
                    Total
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Analytics Charts Section */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Chargeability Heat-map Table */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 400 }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Chargeability % Heat-map
              </Typography>
              <Box sx={{ height: 320, overflowY: 'auto' }}>
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ backgroundColor: '#f5f5f5' }}>
                          <strong>Staff Member</strong>
                        </TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5' }}>
                          <strong>Productive Hrs</strong>
                        </TableCell>
                        <TableCell align="right" sx={{ backgroundColor: '#f5f5f5' }}>
                          <strong>Total Hrs</strong>
                        </TableCell>
                        <TableCell align="center" sx={{ backgroundColor: '#f5f5f5' }}>
                          <strong>Chargeability %</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(chargeabilityData).map(([name, data]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell align="right">{data.productive.toLocaleString()}</TableCell>
                          <TableCell align="right">{data.total.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <Chip
                                label={`${data.chargeability.toFixed(1)}%`}
                                size="small"
                                sx={{
                                  backgroundColor:
                                    data.chargeability >= 80
                                      ? '#4CAF50'
                                      : data.chargeability >= 60
                                        ? '#FF9800'
                                        : '#F44336',
                                  color: 'white',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Budget Consumption Bullet Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 400 }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Budget Consumed (Absolute & %)
              </Typography>
              <Box sx={{ height: 320, overflowY: 'auto', mt: 2 }}>
                {budgetAnalytics.map(project => (
                  <Box key={project.id} sx={{ mb: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body1" fontWeight={600}>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {project.consumed.toLocaleString()} / {project.budget.toLocaleString()} AED
                        ({project.consumedPercentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(project.consumedPercentage, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getProgressColor(project.consumedPercentage),
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Forecast Cost at Completion (EAC) */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, backgroundColor: '#ffffff' }} elevation={1}>
              <Typography variant="h6" color="textPrimary" sx={{ mb: 2 }}>
                Cost Forecast vs Budget Target
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Project</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Budget Target</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Consumed to Date</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Forecast EAC</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Variance</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Status</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {forecastData.map(project => (
                      <TableRow key={project.id}>
                        <TableCell>{project.name}</TableCell>
                        <TableCell align="right">{project.budget.toLocaleString()} AED</TableCell>
                        <TableCell align="right">
                          {project.consumedToDate.toLocaleString()} AED
                        </TableCell>
                        <TableCell align="right">
                          {project.estimatedCompletion.toLocaleString()} AED
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: project.variance > 0 ? '#F44336' : '#4CAF50',
                            fontWeight: 600,
                          }}
                        >
                          {project.variance > 0 ? '+' : ''}
                          {project.variance.toLocaleString()} AED
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={
                              Math.abs(project.variancePercentage) <= 5
                                ? 'On Track'
                                : project.variancePercentage > 5
                                  ? 'Over Budget'
                                  : 'Under Budget'
                            }
                            size="small"
                            sx={{
                              backgroundColor:
                                Math.abs(project.variancePercentage) <= 5
                                  ? '#4CAF50'
                                  : project.variancePercentage > 5
                                    ? '#F44336'
                                    : '#2196F3',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AnalyticsPage;
