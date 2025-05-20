const prisma = require('../prismaClient');

async function main() {
  // Clear existing data
  await prisma.assignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.staff.deleteMany();

  // Seed staff member
  const aisha = await prisma.staff.create({
    data: {
      name: 'Aisha Patel',
      department: 'Analytics',
      role: 'Associate',
    },
  });

  // Seed projects
  const nebula = await prisma.project.create({ data: { name: 'Nebula', description: '' } });
  const vanguard = await prisma.project.create({ data: { name: 'Vanguard', description: '' } });

  // Seed assignments on 19 May 2025 for Aisha Patel
  await prisma.assignment.create({
    data: {
      staffId: aisha.id,
      projectId: nebula.id,
      date: new Date('2025-05-19'),
      hours: 5,
    },
  });
  await prisma.assignment.create({
    data: {
      staffId: aisha.id,
      projectId: vanguard.id,
      date: new Date('2025-05-19'),
      hours: 3,
    },
  });

  console.log('🪴 Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 