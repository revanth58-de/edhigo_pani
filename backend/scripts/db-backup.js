const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');

const backupDir = path.join(__dirname, '../backups');

async function runBackup() {
  console.log('🚀 Starting Database Backup...');
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Fetch all records from every transactional/master model in parallel
    const [
      users,
      jobs,
      attendances,
      payments,
      settlements,
      ratings,
      groups,
      groupMembers,
      groupMessages,
      jobApplications,
      auditLogs,
      userLocations,
      userAnimals,
      disputes,
      notifications,
      machinery,
      machineryBookings,
      systemSettings,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.job.findMany(),
      prisma.attendance.findMany(),
      prisma.payment.findMany(),
      prisma.settlement.findMany(),
      prisma.rating.findMany(),
      prisma.group.findMany(),
      prisma.groupMember.findMany(),
      prisma.groupMessage.findMany(),
      prisma.jobApplication.findMany(),
      prisma.auditLog.findMany(),
      prisma.userLocation.findMany(),
      prisma.userAnimal.findMany(),
      prisma.dispute.findMany(),
      prisma.notification.findMany(),
      prisma.machinery.findMany(),
      prisma.machineryBooking.findMany(),
      prisma.systemSetting.findMany(),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users,
        jobs,
        attendances,
        payments,
        settlements,
        ratings,
        groups,
        groupMembers,
        groupMessages,
        jobApplications,
        auditLogs,
        userLocations,
        userAnimals,
        disputes,
        notifications,
        machinery,
        machineryBookings,
        systemSettings,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup successfully created at: ${backupFile}`);
    console.log(`📦 Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error('❌ Database Backup Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
