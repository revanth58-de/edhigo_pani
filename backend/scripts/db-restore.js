const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/database');

const backupDir = path.join(__dirname, '../backups');

async function runRestore() {
  console.log('🚀 Starting Database Restore...');
  try {
    // Find the latest backup file in backups/ directory
    if (!fs.existsSync(backupDir)) {
      throw new Error('No backups directory found.');
    }

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-') && f.endsWith('.json'));
    if (files.length === 0) {
      throw new Error('No backup JSON files found in backups directory.');
    }

    // Sort files to get the latest
    files.sort();
    const latestFile = path.join(backupDir, files[files.length - 1]);
    console.log(`📦 Restoring from latest file: ${latestFile}`);

    const backupData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const { data } = backupData;

    console.log('🧹 Purging existing database tables...');
    
    // Purge in strict reverse dependency order to prevent constraint errors
    await prisma.machineryBooking.deleteMany({});
    await prisma.machinery.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.settlement.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.jobApplication.deleteMany({});
    await prisma.groupMessage.deleteMany({});
    await prisma.groupMember.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.userLocation.deleteMany({});
    await prisma.userAnimal.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.systemSetting.deleteMany({});
    await prisma.auditLog.deleteMany({});

    console.log('📥 Restoring tables (in safe insertion order)...');

    // 1. Users
    if (data.users.length > 0) {
      await prisma.user.createMany({ data: data.users });
    }
    // 2. System Settings
    if (data.systemSettings && data.systemSettings.length > 0) {
      await prisma.systemSetting.createMany({ data: data.systemSettings });
    }
    // 3. User Locations
    if (data.userLocations && data.userLocations.length > 0) {
      await prisma.userLocation.createMany({ data: data.userLocations });
    }
    // 4. User Animals
    if (data.userAnimals && data.userAnimals.length > 0) {
      await prisma.userAnimal.createMany({ data: data.userAnimals });
    }
    // 5. Jobs
    if (data.jobs && data.jobs.length > 0) {
      await prisma.job.createMany({ data: data.jobs });
    }
    // 6. Job Applications
    if (data.jobApplications && data.jobApplications.length > 0) {
      await prisma.jobApplication.createMany({ data: data.jobApplications });
    }
    // 7. Groups
    if (data.groups && data.groups.length > 0) {
      await prisma.group.createMany({ data: data.groups });
    }
    // 8. Group Members
    if (data.groupMembers && data.groupMembers.length > 0) {
      await prisma.groupMember.createMany({ data: data.groupMembers });
    }
    // 9. Group Messages
    if (data.groupMessages && data.groupMessages.length > 0) {
      await prisma.groupMessage.createMany({ data: data.groupMessages });
    }
    // 10. Machinery
    if (data.machinery && data.machinery.length > 0) {
      await prisma.machinery.createMany({ data: data.machinery });
    }
    // 11. Machinery Bookings
    if (data.machineryBookings && data.machineryBookings.length > 0) {
      await prisma.machineryBooking.createMany({ data: data.machineryBookings });
    }
    // 12. Payments
    if (data.payments && data.payments.length > 0) {
      await prisma.payment.createMany({ data: data.payments });
    }
    // 13. Settlements
    if (data.settlements && data.settlements.length > 0) {
      await prisma.settlement.createMany({ data: data.settlements });
    }
    // 14. Attendance
    if (data.attendances && data.attendances.length > 0) {
      await prisma.attendance.createMany({ data: data.attendances });
    }
    // 15. Ratings
    if (data.ratings && data.ratings.length > 0) {
      await prisma.rating.createMany({ data: data.ratings });
    }
    // 16. Disputes
    if (data.disputes && data.disputes.length > 0) {
      await prisma.dispute.createMany({ data: data.disputes });
    }
    // 17. Notifications
    if (data.notifications && data.notifications.length > 0) {
      await prisma.notification.createMany({ data: data.notifications });
    }
    // 18. Audit Logs
    if (data.auditLogs && data.auditLogs.length > 0) {
      await prisma.auditLog.createMany({ data: data.auditLogs });
    }

    console.log('✅ Database restoration completed successfully!');
  } catch (err) {
    console.error('❌ Database Restore Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRestore();
