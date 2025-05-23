// chatFunctions.js
// Implementation for chat data functions using Prisma ORM.

const prisma = require('./prismaClient');

/**
 * Fetch assignments for a staff member between two dates from the JSON DB.
 */
async function getStaffAssignments({ staffName, from, to }) {
  try {
    console.log(`Fetching assignments for ${staffName} from ${from} to ${to}`);
    
    // Validate inputs
    if (!staffName) {
      return { error: "Staff name is required" };
    }
    
    // Ensure dates are in proper format
    let fromDate, toDate;
    try {
      fromDate = new Date(from);
      toDate = new Date(to);
      
      // Check if dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        console.error("Invalid date format provided");
        fromDate = new Date(); // Default to today
        toDate = new Date();
      }
    } catch (error) {
      console.error("Error parsing dates:", error);
      fromDate = new Date(); // Default to today
      toDate = new Date();
    }
    
    // Clean up staffName in case it includes a department clause like "Lina from Real Estate"
    let cleanedName = staffName;
    const fromMatch = staffName.match(/^(.*?)\s+from\s+/i);
    if (fromMatch) {
      cleanedName = fromMatch[1].trim();
    }

    // Fetch all staff and find matching name case-insensitively
    const allStaff = await prisma.staff.findMany();
    const staff = allStaff.find(
      (s) => s.name.toLowerCase() === cleanedName.toLowerCase()
    );
    
    if (!staff) {
      return { 
        error: "Staff not found",
        staffName,
        availableStaff: allStaff.map(s => s.name) // Return list of available staff
      };
    }
    
    // Query assignments within date range including project data
    const assignments = await prisma.assignment.findMany({
      where: {
        staffId: staff.id,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: { project: true },
    });
    
    // Transform assignments for easier consumption
    const formattedAssignments = assignments.map((a) => ({
      projectId: a.projectId,
      projectName: a.project.name,
      date: a.date.toISOString().split('T')[0],
      hours: a.hours,
    }));
    
    // Add isScheduled flag and more user-friendly information
    return {
      staffId: staff.id,
      staffName: staff.name,
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
      totalDaysChecked: Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1,
      isScheduled: formattedAssignments.length > 0,
      assignments: formattedAssignments,
      totalHours: formattedAssignments.reduce((sum, a) => sum + a.hours, 0)
    };
  } catch (error) {
    console.error("Error in getStaffAssignments:", error);
    return { error: error.message };
  }
}

/**
 * Fetch all staff member details from the database.
 */
async function getAllStaff() {
  const staff = await prisma.staff.findMany();
  return staff;
}

/**
 * Fetch details for a project including budget consumption and remaining budget.
 */
async function getProjectDetails({ projectName }) {
  // Fetch all projects and find matching name case-insensitively
  const allProjects = await prisma.project.findMany();
  const project = allProjects.find(
    p => p.name.toLowerCase() === projectName.toLowerCase()
  );
  if (!project) {
    return null;
  }
  // Sum hours consumed for this project
  const assignments = await prisma.assignment.findMany({
    where: { projectId: project.id }
  });
  const consumedHours = assignments.reduce((sum, a) => sum + a.hours, 0);
  // Compute remaining budget if budget is defined (assuming budget in hours)
  const remainingBudget =
    typeof project.budget === 'number'
      ? project.budget - consumedHours
      : null;
  return {
    projectId: project.id,
    projectName: project.name,
    description: project.description,
    partnerName: project.partnerName,
    teamLead: project.teamLead,
    budget: project.budget,
    consumedHours,
    remainingBudget
  };
}

/**
 * Fetch availability for each staff member in a date range (assigned vs available hours).
 */
async function getTeamAvailability({ from, to }) {
  const startDate = new Date(from);
  const endDate = new Date(to);
  // All staff
  const staffList = await prisma.staff.findMany();
  // All assignments in date range
  const assignments = await prisma.assignment.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    }
  });
  // Calculate days and possible hours (8h per day)
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
  const totalPossible = diffDays * 8;
  // Map each staff to availability
  const availability = staffList.map((s) => {
    const assigned = assignments
      .filter((a) => a.staffId === s.id)
      .reduce((sum, a) => sum + a.hours, 0);
    return {
      staffId: s.id,
      staffName: s.name,
      assignedHours: assigned,
      availableHours: totalPossible - assigned
    };
  });
  return availability;
}

/**
 * Fetch total productive hours for all staff in a date range.
 */
async function getProductiveHours({ from, to }) {
  const startDate = new Date(from);
  const endDate = new Date(to);
  const assignments = await prisma.assignment.findMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  const totalHours = assignments.reduce((sum, a) => sum + a.hours, 0);
  return { from, to, totalProductiveHours: totalHours };
}

/**
 * Fetch productive hours for a specific staff member in a date range.
 */
async function getStaffProductiveHours({ staffName, from, to }) {
  // Fetch all staff and find matching name case-insensitively
  const allStaff = await prisma.staff.findMany();
  const staff = allStaff.find(s => s.name.toLowerCase() === staffName.toLowerCase());
  if (!staff) {
    return { staffName, productiveHours: 0 };
  }
  const startDate = new Date(from);
  const endDate = new Date(to);
  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: staff.id,
      date: { gte: startDate, lte: endDate }
    }
  });
  const totalHours = assignments.reduce((sum, a) => sum + a.hours, 0);
  return { staffId: staff.id, staffName: staff.name, from, to, productiveHours: totalHours };
}

/**
 * Create assignments based on the AI-generated schedule
 */
async function createAssignmentsFromSchedule(schedule) {
  const createdAssignments = [];
  
  for (const assignment of schedule.assignments) {
    const { staffId, projectId, date, hours } = assignment;
    
    try {
      const newAssignment = await prisma.assignment.create({
        data: {
          staffId,
          projectId,
          date: new Date(date),
          hours,
        },
        include: { project: true, staff: true }
      });
      
      createdAssignments.push({
        id: newAssignment.id,
        staffName: newAssignment.staff.name,
        projectName: newAssignment.project.name,
        date: newAssignment.date.toISOString().split('T')[0],
        hours: newAssignment.hours
      });
    } catch (error) {
      console.error(`Failed to create assignment: ${error.message}`);
    }
  }
  
  return {
    success: true,
    message: `Created ${createdAssignments.length} assignments`,
    assignments: createdAssignments
  };
}

/**
 * Parse booking commands from natural language
 */
function parseBookingCommand(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check if it's a booking command
  const bookingKeywords = ['book', 'schedule', 'assign', 'allocate'];
  const isBookingCommand = bookingKeywords.some(keyword => lowerQuery.includes(keyword));
  
  if (!isBookingCommand) {
    return null;
  }
  
  // Extract staff name (supports "firstname lastname" format)
  const staffNameMatch = lowerQuery.match(/(?:book|schedule|assign|allocate)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/);
  const staffName = staffNameMatch ? staffNameMatch[1].trim() : null;
  
  // Extract project name (supports "project name" after "on project" or "to project")
  const projectMatch = lowerQuery.match(/(?:on|to)\s+(?:project\s+)?([a-zA-Z][a-zA-Z0-9\s]*?)(?:\s+for|\s+on\s+\d|$)/);
  const projectName = projectMatch ? projectMatch[1].trim() : null;
  
  // Extract hours
  const hoursMatch = lowerQuery.match(/(\d+)\s*(?:hrs?|hours?)/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : null;
  
  // Extract date (supports various formats)
  const dateMatch = lowerQuery.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i);
  let date = null;
  
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const monthNames = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const monthIndex = monthNames[month.toLowerCase()];
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    date = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`;
  }
  
  return {
    isBookingCommand: true,
    staffName,
    projectName,
    hours,
    date,
    originalQuery: query
  };
}

/**
 * Fast direct booking function that bypasses the orchestrator for simple bookings
 */
async function directBooking({ staffName, projectName, hours, date }) {
  try {
    console.log(`Direct booking: ${staffName} -> ${projectName} for ${hours}h on ${date}`);
    
    // Validate inputs
    if (!staffName || !projectName || !hours || !date) {
      return {
        success: false,
        error: "Missing required booking information",
        message: `Please provide: staff name${!staffName ? ' ✗' : ' ✓'}, project name${!projectName ? ' ✗' : ' ✓'}, hours${!hours ? ' ✗' : ' ✓'}, and date${!date ? ' ✗' : ' ✓'}`
      };
    }
    
    // Find staff by name (case-insensitive)
    const allStaff = await prisma.staff.findMany();
    const staff = allStaff.find(s => s.name.toLowerCase().includes(staffName.toLowerCase()) || staffName.toLowerCase().includes(s.name.toLowerCase()));
    
    if (!staff) {
      const availableStaff = allStaff.map(s => s.name).join(', ');
      return {
        success: false,
        error: "Staff member not found",
        message: `Could not find staff member "${staffName}". Available staff: ${availableStaff}`
      };
    }
    
    // Find project by name (case-insensitive)
    const allProjects = await prisma.project.findMany();
    const project = allProjects.find(p => p.name.toLowerCase().includes(projectName.toLowerCase()) || projectName.toLowerCase().includes(p.name.toLowerCase()));
    
    if (!project) {
      const availableProjects = allProjects.map(p => p.name).join(', ');
      return {
        success: false,
        error: "Project not found",
        message: `Could not find project "${projectName}". Available projects: ${availableProjects}`
      };
    }
    
    // Check if staff is already assigned on this date
    const targetDate = new Date(date);
    const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
    
    const existingAssignments = await prisma.assignment.findMany({
      where: {
        staffId: staff.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: { project: true }
    });
    
    const currentHours = existingAssignments.reduce((sum, a) => sum + a.hours, 0);
    const newTotalHours = currentHours + hours;
    
    // Check capacity (assuming 8-hour workday)
    if (newTotalHours > 8) {
      const overbooked = newTotalHours - 8;
      const currentProjects = existingAssignments.map(a => `${a.project.name} (${a.hours}h)`).join(', ');
      return {
        success: false,
        error: "Staff member would be overbooked",
        message: `${staff.name} already has ${currentHours}h assigned on ${date} (${currentProjects}). Adding ${hours}h would exceed 8-hour limit by ${overbooked}h.`
      };
    }
    
    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        staffId: staff.id,
        projectId: project.id,
        date: startOfDay,
        hours: hours
      },
      include: {
        staff: true,
        project: true
      }
    });
    
    return {
      success: true,
      message: `Successfully booked ${staff.name} on ${project.name} for ${hours} hour(s) on ${date}`,
      assignment: {
        id: assignment.id,
        staffName: assignment.staff.name,
        projectName: assignment.project.name,
        date: assignment.date.toISOString().split('T')[0],
        hours: assignment.hours,
        totalHoursOnDate: newTotalHours,
        remainingCapacity: 8 - newTotalHours
      }
    };
    
  } catch (error) {
    console.error("Error in directBooking:", error);
    return {
      success: false,
      error: "Database error",
      message: `Failed to create booking: ${error.message}`
    };
  }
}

module.exports = {
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours,
  createAssignmentsFromSchedule,
  parseBookingCommand,
  directBooking
}; 