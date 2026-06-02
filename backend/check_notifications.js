const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetId = '7abc3c28-b699-4660-a119-1b07f5781313';
  console.log(`--- Checking User: ${targetId} ---`);
  
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      notifications: true
    }
  });
  
  if (!user) {
    console.log('User not found in database.');
    return;
  }
  
  console.log(`User Info:`);
  console.log(`- Name: ${user.name}`);
  console.log(`- Phone: ${user.phone}`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Notifications count: ${user.notifications?.length}`);
  
  if (user.notifications?.length > 0) {
    user.notifications.forEach((n, i) => {
      console.log(`  [${i+1}] Title: "${n.title}", Body: "${n.body}", isRead: ${n.isRead}`);
    });
  } else {
    console.log('No notifications found for this specific user ID in the database.');
  }

  // Also print all users just to see their IDs and names
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, phone: true, role: true }
  });
  console.log('\nAll users in database:');
  allUsers.forEach(u => {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Phone: ${u.phone}, Role: ${u.role}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
