const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const testPhones = ['9111111111','9222222222','9000000001','9731096583','9999999999'];

  for (const phone of testPhones) {
    const u = await prisma.user.findUnique({ where: { phone } });
    if (u) {
      await prisma.jobApplication.deleteMany({ where: { workerId: u.id } });
      await prisma.job.delete({ where: { id: undefined } }).catch(() => {}); // ignore
      await prisma.job.deleteMany({ where: { farmerId: u.id } });
      await prisma.user.delete({ where: { phone } });
      console.log('✅ Deleted test user:', phone);
    }
  }

  // Reset any stuck "accepted" jobs back to "pending" so real users can take them
  const fixed = await prisma.job.updateMany({
    where: { status: 'accepted' },
    data: { status: 'pending' },
  });
  console.log('🔄 Reset stuck accepted jobs back to pending:', fixed.count);

  await prisma.$disconnect();
  console.log('🧹 Cleanup complete!');
}

cleanup().catch((e) => {
  console.error('Cleanup error:', e);
  process.exit(1);
});
