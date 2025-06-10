import React, { useMemo, useState } from 'react';
import { getDaysInMonth, parseISO } from 'date-fns';
import { Box, ToggleButton, ToggleButtonGroup, Paper, Typography } from '@mui/material';
import HierarchicalPivotTable, { PivotColumn, PivotNode } from './HierarchicalPivotTable';
import { StaffMember } from '../../store/slices/staffSlice';
import { ScheduleTask } from '../../store/slices/scheduleSlice';

type HierarchyMode = 'country' | 'department';

interface StaffAnalyticsPivotTableProps {
  staffMembers: StaffMember[];
  tasks: ScheduleTask[];
  gradeRates: Record<string, number>;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'overall';
  startDate: string;
}

interface StaffMetrics {
  productiveHours: number;
  totalWorkingHours: number;
  chargeability: number;
  budgetConsumed: number;
}

const StaffAnalyticsPivotTable: React.FC<StaffAnalyticsPivotTableProps> = ({
  staffMembers,
  tasks,
  gradeRates,
  timeframe,
  startDate,
}) => {
  const [hierarchyMode, setHierarchyMode] = useState<HierarchyMode>('country');

  const columns: PivotColumn[] = [
    {
      key: 'productiveHours',
      title: 'Total Productive Hrs',
      align: 'right',
      width: '140px',
    },
    {
      key: 'totalWorkingHours',
      title: 'Total Working Hrs',
      align: 'right',
      width: '140px',
    },
    {
      key: 'chargeability',
      title: 'Chargeability %',
      align: 'right',
      width: '120px',
      useColorChip: true,
    },
    {
      key: 'budgetConsumed',
      title: 'Budget Consumed',
      align: 'right',
      width: '140px',
      format: (value: number) => `${value.toLocaleString()} AED`,
    },
  ];

  const calculateStaffMetrics = (staff: StaffMember): StaffMetrics => {
    const staffTasks = tasks.filter(task => task.staffId === staff.id);
    
    // Calculate total possible working hours based on timeframe (matching AnalyticsPage logic)
    let totalPossibleHours = 0;
    if (timeframe === 'daily') {
      totalPossibleHours = 8; // 1 day × 8 hours
    } else if (timeframe === 'weekly') {
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
    
    // Productive hours: tasks that have a projectId and are not leave
    const productiveHours = staffTasks
      .filter(task => 
        task.projectId && 
        !['Available', 'Annual Leave', 'Sick Leave'].includes(task.taskType)
      )
      .reduce((sum, task) => sum + task.hours, 0);

    // Calculate actual total hours taken by leave
    const leaveHours = staffTasks
      .filter(task => ['Annual Leave', 'Sick Leave'].includes(task.taskType))
      .reduce((sum, task) => sum + task.hours, 0);

    // Total available hours = total possible hours - leave hours (matching AnalyticsPage logic)
    const totalAvailableHours = totalPossibleHours - leaveHours;

    // Chargeability: productive hours as percentage of total available hours
    const chargeability = totalAvailableHours > 0 ? (productiveHours / totalAvailableHours) * 100 : 0;

    // Budget consumed: productive hours * staff rate
    const staffRate = gradeRates[staff.grade] || 0;
    const budgetConsumed = productiveHours * staffRate;

    return {
      productiveHours,
      totalWorkingHours: totalAvailableHours,
      chargeability,
      budgetConsumed,
    };
  };

  const aggregateMetrics = (metrics: StaffMetrics[]): StaffMetrics => {
    const totalProductiveHours = metrics.reduce((sum, m) => sum + m.productiveHours, 0);
    const totalWorkingHours = metrics.reduce((sum, m) => sum + m.totalWorkingHours, 0);
    const totalBudgetConsumed = metrics.reduce((sum, m) => sum + m.budgetConsumed, 0);
    const chargeability = totalWorkingHours > 0 ? (totalProductiveHours / totalWorkingHours) * 100 : 0;

    return {
      productiveHours: totalProductiveHours,
      totalWorkingHours,
      chargeability,
      budgetConsumed: totalBudgetConsumed,
    };
  };

  const buildCountryHierarchy = (): PivotNode[] => {
    // Group staff by country > city > department
    const countryGroups: Record<string, Record<string, Record<string, StaffMember[]>>> = {};

    staffMembers.forEach(staff => {
      const country = staff.country || 'Unknown Country';
      const city = staff.city || 'Unknown City';
      const department = staff.department || 'Unknown Department';

      if (!countryGroups[country]) {
        countryGroups[country] = {};
      }
      if (!countryGroups[country][city]) {
        countryGroups[country][city] = {};
      }
      if (!countryGroups[country][city][department]) {
        countryGroups[country][city][department] = [];
      }

      countryGroups[country][city][department].push(staff);
    });

    // Build hierarchical structure
    const result: PivotNode[] = [];

    Object.entries(countryGroups).forEach(([countryName, cities]) => {
      const cityNodes: PivotNode[] = [];
      const countryStaffMetrics: StaffMetrics[] = [];

      Object.entries(cities).forEach(([cityName, departments]) => {
        const departmentNodes: PivotNode[] = [];
        const cityStaffMetrics: StaffMetrics[] = [];

        Object.entries(departments).forEach(([departmentName, departmentStaff]) => {
          const staffNodes: PivotNode[] = [];
          const departmentStaffMetrics: StaffMetrics[] = [];

          departmentStaff.forEach(staff => {
            const staffMetrics = calculateStaffMetrics(staff);
            departmentStaffMetrics.push(staffMetrics);
            
            staffNodes.push({
              id: `staff-${staff.id}`,
              name: staff.name,
              level: 3,
              data: staffMetrics,
              isLeaf: true,
            });
          });

          const departmentAggregatedMetrics = aggregateMetrics(departmentStaffMetrics);
          cityStaffMetrics.push(...departmentStaffMetrics);

          departmentNodes.push({
            id: `department-${countryName}-${cityName}-${departmentName}`,
            name: departmentName,
            level: 2,
            data: departmentAggregatedMetrics,
            children: staffNodes,
          });
        });

        const cityAggregatedMetrics = aggregateMetrics(cityStaffMetrics);
        countryStaffMetrics.push(...cityStaffMetrics);

        cityNodes.push({
          id: `city-${countryName}-${cityName}`,
          name: cityName,
          level: 1,
          data: cityAggregatedMetrics,
          children: departmentNodes,
        });
      });

      const countryAggregatedMetrics = aggregateMetrics(countryStaffMetrics);

      result.push({
        id: `country-${countryName}`,
        name: countryName,
        level: 0,
        data: countryAggregatedMetrics,
        children: cityNodes,
      });
    });

    // Sort countries by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const buildDepartmentHierarchy = (): PivotNode[] => {
    // Group staff by department > country > city
    const departmentGroups: Record<string, Record<string, Record<string, StaffMember[]>>> = {};

    staffMembers.forEach(staff => {
      const department = staff.department || 'Unknown Department';
      const country = staff.country || 'Unknown Country';
      const city = staff.city || 'Unknown City';

      if (!departmentGroups[department]) {
        departmentGroups[department] = {};
      }
      if (!departmentGroups[department][country]) {
        departmentGroups[department][country] = {};
      }
      if (!departmentGroups[department][country][city]) {
        departmentGroups[department][country][city] = [];
      }

      departmentGroups[department][country][city].push(staff);
    });

    // Build hierarchical structure
    const result: PivotNode[] = [];

    Object.entries(departmentGroups).forEach(([departmentName, countries]) => {
      const countryNodes: PivotNode[] = [];
      const departmentStaffMetrics: StaffMetrics[] = [];

      Object.entries(countries).forEach(([countryName, cities]) => {
        const cityNodes: PivotNode[] = [];
        const countryStaffMetrics: StaffMetrics[] = [];

        Object.entries(cities).forEach(([cityName, cityStaff]) => {
          const staffNodes: PivotNode[] = [];
          const cityStaffMetrics: StaffMetrics[] = [];

          cityStaff.forEach(staff => {
            const staffMetrics = calculateStaffMetrics(staff);
            cityStaffMetrics.push(staffMetrics);
            
            staffNodes.push({
              id: `staff-${staff.id}`,
              name: staff.name,
              level: 3,
              data: staffMetrics,
              isLeaf: true,
            });
          });

          const cityAggregatedMetrics = aggregateMetrics(cityStaffMetrics);
          countryStaffMetrics.push(...cityStaffMetrics);

          cityNodes.push({
            id: `city-${departmentName}-${countryName}-${cityName}`,
            name: cityName,
            level: 2,
            data: cityAggregatedMetrics,
            children: staffNodes,
          });
        });

        const countryAggregatedMetrics = aggregateMetrics(countryStaffMetrics);
        departmentStaffMetrics.push(...countryStaffMetrics);

        countryNodes.push({
          id: `country-${departmentName}-${countryName}`,
          name: countryName,
          level: 1,
          data: countryAggregatedMetrics,
          children: cityNodes,
        });
      });

      const departmentAggregatedMetrics = aggregateMetrics(departmentStaffMetrics);

      result.push({
        id: `department-${departmentName}`,
        name: departmentName,
        level: 0,
        data: departmentAggregatedMetrics,
        children: countryNodes,
      });
    });

    // Sort departments by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const hierarchicalData = useMemo(() => {
    return hierarchyMode === 'country' ? buildCountryHierarchy() : buildDepartmentHierarchy();
  }, [staffMembers, tasks, gradeRates, timeframe, startDate, hierarchyMode]);

  const handleHierarchyModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: HierarchyMode | null,
  ) => {
    if (newMode !== null) {
      setHierarchyMode(newMode);
    }
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#ffffff', height: 400 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="textPrimary">
          Staff Analytics Breakdown
        </Typography>
        <ToggleButtonGroup
          value={hierarchyMode}
          exclusive
          onChange={handleHierarchyModeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 3,
              py: 1,
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#ffffff',
              color: '#374151',
              minWidth: '80px',
              height: '36px',
              textTransform: 'none',
              '&.Mui-selected': {
                backgroundColor: '#10b981',
                color: 'white',
                border: '1px solid #10b981',
                '&:hover': {
                  backgroundColor: '#059669',
                  border: '1px solid #059669',
                },
              },
              '&:hover': {
                backgroundColor: '#f9fafb',
                border: '1px solid #d1d5db',
              },
              '&:not(:last-of-type)': {
                marginRight: '8px',
              },
            },
            '& .MuiToggleButtonGroup-grouped': {
              border: '1px solid #e0e0e0',
              '&.Mui-selected': {
                border: '1px solid #10b981',
              },
              '&:not(:first-of-type)': {
                borderLeft: '1px solid #e0e0e0',
                marginLeft: 0,
              },
              '&.Mui-selected:not(:first-of-type)': {
                borderLeft: '1px solid #10b981',
              },
            },
          }}
        >
          <ToggleButton value="country">
            Country
          </ToggleButton>
          <ToggleButton value="department">
            Department
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ height: 320, overflowY: 'auto' }}>
        <HierarchicalPivotTable
          title=""
          data={hierarchicalData}
          columns={columns}
          height={320}
        />
      </Box>
    </Paper>
  );
};

export default StaffAnalyticsPivotTable; 