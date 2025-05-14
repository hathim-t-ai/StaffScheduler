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

interface FilterSidebarProps {
  staffMembers: StaffMember[];
  onFilterChange: (filteredStaff: StaffMember[]) => void;
  onWeeklyAssign: (staffId: string) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  staffMembers,
  onFilterChange,
  onWeeklyAssign
}) => {
  // State for filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  
  // Get all unique departments, cities, countries, and skills from staff data
  const uniqueDepartments = Array.from(new Set(staffMembers.map(staff => staff.department)));
  const uniqueCities = Array.from(new Set(staffMembers.map(staff => staff.city)));
  const uniqueCountries = Array.from(new Set(staffMembers.map(staff => staff.country)));
  const uniqueSkills = Array.from(
    new Set(staffMembers.flatMap(staff => staff.skills || []))
  );

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
    
    onFilterChange(result);
  }, [staffMembers, departmentFilter, cityFilter, countryFilter, skillsFilter, onFilterChange]);

  // Clear all filters
  const clearFilters = () => {
    setDepartmentFilter('');
    setCityFilter('');
    setCountryFilter('');
    setSkillsFilter([]);
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
      </Box>
      
      {/* Staff list */}
      <Typography variant="subtitle1" sx={{ px: 2, pt: 2, pb: 1 }}>
        Staff Members
      </Typography>
      <List dense sx={{ overflowY: 'auto' }}>
        {staffMembers.filter(staff => {
          // Apply filters for the displayed list
          if (departmentFilter && staff.department !== departmentFilter) return false;
          if (cityFilter && staff.city !== cityFilter) return false;
          if (countryFilter && staff.country !== countryFilter) return false;
          if (skillsFilter.length > 0 && (!staff.skills || !skillsFilter.every(skill => staff.skills?.includes(skill)))) return false;
          return true;
        }).map((staff) => (
          <ListItem 
            key={staff.id}
            divider
            secondaryAction={
              <IconButton 
                edge="end" 
                size="small" 
                onClick={() => onWeeklyAssign(staff.id)}
                title="Assign weekly schedule"
              >
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText 
              primary={staff.name} 
              secondary={staff.department}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default FilterSidebar; 