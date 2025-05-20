// chatFunctions.js
// Implementation for chat data functions using Prisma ORM.

const prisma = require('./prismaClient');

/**
 * Fetch assignments for a staff member between two dates from the JSON DB.
 */
async function getStaffAssignments({ staffName, from, to }) {
  // Find staff by name
  const staff = await prisma.staff.findFirst({ where: { name: staffName } });
  if (!staff) {
    return [];
  }
  // Query assignments within date range including project data
  const assignments = await prisma.assignment.findMany({
    where: {
      staffId: staff.id,
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: { project: true },
  });
  return assignments.map((a) => ({
    projectId: a.projectId,
    projectName: a.project.name,
    date: a.date.toISOString().split('T')[0],
    hours: a.hours,
  }));
}

module.exports = { getStaffAssignments }; 