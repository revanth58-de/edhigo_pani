const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCheckIn() {
  try {
    const jobId = 'a40437d4-ce35-44d4-b0f7-785665190d74';
    // Using an existing worker ID from the DB
    const worker = await prisma.user.findFirst({ where: { role: 'worker' } });
    if (!worker) return console.log('No worker found');

    const workerId = worker.id;
    const qrCodeIn = jobId + '|' + Date.now();
    const checkInLatitude = 15.744621;
    const checkInLongitude = 79.275106;

    // Simulate lines 96-109 from attendance.controller.js
    const attendance = await prisma.attendance.create({
      data: {
        jobId,
        workerId,
        qrCodeIn,
        checkIn: new Date(),
        checkInLatitude: parseFloat(checkInLatitude),
        checkInLongitude: parseFloat(checkInLongitude),
      },
      include: {
        job: true,
        worker: { select: { name: true, photoUrl: true } }
      }
    });

    console.log('SUCCESS CREATED ATTENDANCE:', attendance.id);

    // Clean it up immediately
    await prisma.attendance.delete({ where: { id: attendance.id } });

  } catch (err) {
    console.error('=== PRISMA ERROR (500 CAUSE) ===');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testCheckIn();
