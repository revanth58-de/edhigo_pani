const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple database seeding...');

  // Clear existing data
  await prisma.jobApplication.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create test users
  const farmer1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      role: 'farmer',
      language: 'en',
      name: 'Rajesh Kumar',
      status: 'available',
      latitude: 17.385044,
      longitude: 78.486671
    }
  });

  const worker1 = await prisma.user.create({
    data: {
      phone: '+919876543211',
      role: 'worker',
      language: 'te',
      name: 'Venkat Reddy',
      status: 'available',
      latitude: 17.386044,
      longitude: 78.487671
    }
  });

  const worker2 = await prisma.user.create({
    data: {
      phone: '+919876543212',
      role: 'worker',
      language: 'te',
      name: 'Srinivas',
      status: 'available',
      latitude: 17.387044,
      longitude: 78.488671
    }
  });

  console.log('✅ Created test users');

  // Create test jobs with minimal fields
  const job1 = await prisma.job.create({
    data: {
      farmerId: farmer1.id,
      workType: 'harvesting',
      payPerDay: 500,
      farmAddress: 'Gachibowli, Hyderabad',
      status: 'pending'
    }
  });

  const job2 = await prisma.job.create({
    data: {
      farmerId: farmer1.id,
      workType: 'sowing',
      workersNeeded: 3,
      payPerDay: 400,
      farmAddress: 'Madhapur, Hyderabad',
      status: 'pending'
    }
  });

  console.log('✅ Created test jobs');

  console.log(`\n🎉 Seeding completed!\n`);
  console.log('📱 Test accounts:');
  console.log('  Farmer: +919876543210 (Rajesh Kumar)');
  console.log(`    - Job ID: ${job1.id} (Harvesting)`);
  console.log(`    - Job ID: ${job2.id} (Sowing)`);
  console.log('  Worker 1: +919876543211 (Venkat Reddy)');
  console.log('  Worker 2: +919876543212 (Srinivas)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
