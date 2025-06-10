import React, { useMemo } from 'react';
import HierarchicalPivotTable, { PivotColumn, PivotNode } from './HierarchicalPivotTable';
import { Project } from '../../store/slices/projectSlice';
import { StaffMember } from '../../store/slices/staffSlice';
import { ScheduleTask } from '../../store/slices/scheduleSlice';

interface PartnerAnalyticsPivotTableProps {
  projects: Project[];
  staffMembers: StaffMember[];
  tasks: ScheduleTask[];
  gradeRates: Record<string, number>;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'overall';
  startDate: string;
}

interface PartnerMetrics {
  totalBudget: number;
  budgetConsumed: number;
  totalWorkingHoursAssigned: number;
}

const PartnerAnalyticsPivotTable: React.FC<PartnerAnalyticsPivotTableProps> = ({
  projects,
  staffMembers,
  tasks,
  gradeRates,
  timeframe,
  startDate,
}) => {
  const columns: PivotColumn[] = [
    {
      key: 'totalBudget',
      title: 'Total Budget',
      align: 'right',
      width: '140px',
      format: (value: number) => `${value.toLocaleString()} AED`,
    },
    {
      key: 'budgetConsumed',
      title: 'Budget Consumed',
      align: 'right',
      width: '140px',
      format: (value: number) => `${value.toLocaleString()} AED`,
    },
    {
      key: 'totalWorkingHoursAssigned',
      title: 'Total Working Hrs Assigned',
      align: 'right',
      width: '180px',
    },
  ];

  const calculateProjectMetrics = (project: Project): PartnerMetrics => {
    // Get all tasks for this project
    const projectTasks = tasks.filter(task => task.projectId === project.id);
    
    // Calculate total working hours assigned (all tasks for this project)
    const totalWorkingHoursAssigned = projectTasks.reduce((sum, task) => sum + task.hours, 0);

    // Calculate budget consumed based on staff rates and hours worked
    const budgetConsumed = projectTasks.reduce((sum, task) => {
      const staff = staffMembers.find(s => s.id === task.staffId);
      const staffRate = staff ? gradeRates[staff.grade] || 0 : 0;
      return sum + (task.hours * staffRate);
    }, 0);

    return {
      totalBudget: project.budget || 0,
      budgetConsumed,
      totalWorkingHoursAssigned,
    };
  };

  const aggregateMetrics = (metrics: PartnerMetrics[]): PartnerMetrics => {
    return {
      totalBudget: metrics.reduce((sum, m) => sum + m.totalBudget, 0),
      budgetConsumed: metrics.reduce((sum, m) => sum + m.budgetConsumed, 0),
      totalWorkingHoursAssigned: metrics.reduce((sum, m) => sum + m.totalWorkingHoursAssigned, 0),
    };
  };

  const hierarchicalData = useMemo(() => {
    // Group projects by partner
    const partnerGroups: Record<string, Project[]> = {};

    projects.forEach(project => {
      const partnerName = project.partnerName || 'Unknown Partner';
      
      if (!partnerGroups[partnerName]) {
        partnerGroups[partnerName] = [];
      }
      
      partnerGroups[partnerName].push(project);
    });

    // Build hierarchical structure
    const result: PivotNode[] = [];

    Object.entries(partnerGroups).forEach(([partnerName, partnerProjects]) => {
      const projectNodes: PivotNode[] = [];
      const partnerMetrics: PartnerMetrics[] = [];

      partnerProjects.forEach(project => {
        const projectMetrics = calculateProjectMetrics(project);
        partnerMetrics.push(projectMetrics);
        
        projectNodes.push({
          id: `project-${project.id}`,
          name: project.name,
          level: 1,
          data: projectMetrics,
          isLeaf: true,
        });
      });

      // Sort projects by name within each partner
      projectNodes.sort((a, b) => a.name.localeCompare(b.name));

      const partnerAggregatedMetrics = aggregateMetrics(partnerMetrics);

      result.push({
        id: `partner-${partnerName}`,
        name: partnerName,
        level: 0,
        data: partnerAggregatedMetrics,
        children: projectNodes,
      });
    });

    // Sort partners by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, staffMembers, tasks, gradeRates, timeframe, startDate]);

  return (
    <HierarchicalPivotTable
      title="Partner Analytics Breakdown"
      data={hierarchicalData}
      columns={columns}
      height={400}
    />
  );
};

export default PartnerAnalyticsPivotTable; 