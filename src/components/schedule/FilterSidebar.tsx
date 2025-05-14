import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Chip,
  OutlinedInput
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { StaffMember } from '../../store/slices/staffSlice';
import { ScheduleTask } from '../../store/slices/scheduleSlice';
import { Project } from '../../store/slices/projectSlice';

interface FilterSidebarProps {
  staffMembers: StaffMember[];
  scheduleTasks: ScheduleTask[];
  projects: Project[];
  onFilterChange: (filteredStaff: StaffMember[]) => void;
  onWeeklyAssign: (staffId: string) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  staffMembers,
  scheduleTasks,
  projects,
  onFilterChange,
  onWeeklyAssign
}) => {
  // State for filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [teamLeadFilter, setTeamLeadFilter] = useState<string>('');
  const [partnerFilter, setPartnerFilter] = useState<string>('');
  
  // Get all unique departments, cities, countries, and skills from staff data
  const uniqueDepartments = Array.from(new Set(staffMembers.map(staff => staff.department)));
  const uniqueCities = Array.from(new Set(staffMembers.map(staff => staff.city)));
  const uniqueCountries = Array.from(new Set(staffMembers.map(staff => staff.country)));
  const uniqueSkills = Array.from(
    new Set(staffMembers.flatMap(staff => staff.skills || []))
  );
  // Unique project, team lead, and partner options
  const uniqueTeamLeads = Array.from(new Set(projects.map(proj => proj.teamLead)));
  const uniquePartners = Array.from(new Set(projects.map(proj => proj.partnerName)));

  // Apply filters to staff members
  useEffect(() => {
    let result = [...staffMembers];
    
    if (departmentFilter) {
      result = result.filter(staff => staff.department === departmentFilter);
    }
    
    if (cityFilter) {
      result = result.filter(staff => staff.city === cityFilter);
    }
    
    if (countryFilter) {
      result = result.filter(staff => staff.country === countryFilter);
    }
    
    if (skillsFilter.length > 0) {
      result = result.filter(staff => 
        skillsFilter.every(skill => staff.skills && staff.skills.includes(skill))
      );
    }
    // Project filter: only staff with assignments on selected project
    if (projectFilter) {
      const staffIds = scheduleTasks
        .filter(task => task.projectId === projectFilter)
        .map(task => task.staffId);
      result = result.filter(staff => staffIds.includes(staff.id));
    }
    // Team Lead filter: staff assigned to projects led by selected team lead
    if (teamLeadFilter) {
      const projIds = projects
        .filter(p => p.teamLead === teamLeadFilter)
        .map(p => p.id);
      const staffIds = scheduleTasks
        .filter(task => task.projectId && projIds.includes(task.projectId as string))
        .map(task => task.staffId);
      result = result.filter(staff => staffIds.includes(staff.id));
    }
    // Partner filter: staff assigned to projects for selected partner
    if (partnerFilter) {
      const projIds = projects
        .filter(p => p.partnerName === partnerFilter)
        .map(p => p.id);
      const staffIds = scheduleTasks
        .filter(task => task.projectId && projIds.includes(task.projectId as string))
        .map(task => task.staffId);
      result = result.filter(staff => staffIds.includes(staff.id));
    }
    
    onFilterChange(result);
  }, [
    staffMembers,
    departmentFilter,
    cityFilter,
    countryFilter,
    skillsFilter,
    projectFilter,
    teamLeadFilter,
    partnerFilter,
    scheduleTasks,
    projects,
    onFilterChange
  ]);

  // Clear all filters
  const clearFilters = () => {
    setDepartmentFilter('');
    setCityFilter('');
    setCountryFilter('');
    setSkillsFilter([]);
    setProjectFilter('');
    setTeamLeadFilter('');
    setPartnerFilter('');
  };

  return (
    <Box sx={{
      width: { xs: '25%', md: '18%' },
      minWidth: { md: '200px' },
      maxWidth: { md: '300px' },
      borderRight: 1,
      borderColor: 'divider',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        Filters
        <IconButton size="small" onClick={clearFilters} sx={{ ml: 1 }} title="Clear all filters">
          <ClearIcon fontSize="small" />
        </IconButton>
      </Typography>
      
      {/* Department Filter */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="department-filter-label">Department</InputLabel>
          <Select
            labelId="department-filter-label"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            label="Department"
            endAdornment={
              departmentFilter && (
                <IconButton 
                  size="small" 
                  onClick={() => setDepartmentFilter('')}
                  sx={{ mr: 2 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Departments</MenuItem>
            {uniqueDepartments.map((dept) => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* City Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="city-filter-label">City</InputLabel>
          <Select
            labelId="city-filter-label"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            label="City"
            endAdornment={
              cityFilter && (
                <IconButton 
                  size="small" 
                  onClick={() => setCityFilter('')}
                  sx={{ mr: 2 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Cities</MenuItem>
            {uniqueCities.map((city) => (
              <MenuItem key={city} value={city}>{city}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Country Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="country-filter-label">Country</InputLabel>
          <Select
            labelId="country-filter-label"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            label="Country"
            endAdornment={
              countryFilter && (
                <IconButton 
                  size="small" 
                  onClick={() => setCountryFilter('')}
                  sx={{ mr: 2 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Countries</MenuItem>
            {uniqueCountries.map((country) => (
              <MenuItem key={country} value={country}>{country}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {/* Skills Filter */}
        <FormControl fullWidth size="small">
          <InputLabel id="skills-filter-label">Skills</InputLabel>
          <Select
            labelId="skills-filter-label"
            multiple
            value={skillsFilter}
            onChange={(e) => setSkillsFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            input={<OutlinedInput label="Skills" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={value} 
                    size="small"
                    onDelete={() => setSkillsFilter(skillsFilter.filter(s => s !== value))}
                    deleteIcon={<ClearIcon fontSize="small" />}
                  />
                ))}
              </Box>
            )}
          >
            {uniqueSkills.map((skill) => (
              <MenuItem key={skill} value={skill}>
                <Checkbox checked={skillsFilter.indexOf(skill) > -1} />
                <ListItemText primary={skill} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Project Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="project-filter-label">Project</InputLabel>
          <Select
            labelId="project-filter-label"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value as string)}
            label="Project"
            endAdornment={
              projectFilter && (
                <IconButton size="small" onClick={() => setProjectFilter('')} sx={{ mr: 2 }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Projects</MenuItem>
            {projects.map((proj) => (
              <MenuItem key={proj.id} value={proj.id}>{proj.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Team Lead Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="teamlead-filter-label">Team Lead</InputLabel>
          <Select
            labelId="teamlead-filter-label"
            value={teamLeadFilter}
            onChange={(e) => setTeamLeadFilter(e.target.value as string)}
            label="Team Lead"
            endAdornment={
              teamLeadFilter && (
                <IconButton size="small" onClick={() => setTeamLeadFilter('')} sx={{ mr: 2 }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Team Leads</MenuItem>
            {uniqueTeamLeads.map((tl) => (
              <MenuItem key={tl} value={tl}>{tl}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Partner Filter */}
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="partner-filter-label">Partner</InputLabel>
          <Select
            labelId="partner-filter-label"
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value as string)}
            label="Partner"
            endAdornment={
              partnerFilter && (
                <IconButton size="small" onClick={() => setPartnerFilter('')} sx={{ mr: 2 }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )
            }
          >
            <MenuItem value="">All Partners</MenuItem>
            {uniquePartners.map((pr) => (
              <MenuItem key={pr} value={pr}>{pr}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default FilterSidebar; 