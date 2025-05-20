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
    
    // Fetch all staff and find matching name case-insensitively
    const allStaff = await prisma.staff.findMany();
    const staff = allStaff.find(s => s.name.toLowerCase() === staffName.toLowerCase());
    
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

module.exports = {
  getStaffAssignments,
  getAllStaff,
  getProjectDetails,
  getTeamAvailability,
  getProductiveHours,
  getStaffProductiveHours,
  createAssignmentsFromSchedule
}; 