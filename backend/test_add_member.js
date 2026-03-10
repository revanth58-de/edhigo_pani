const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const groups = await prisma.group.findMany({ include: { members: true } });
  if (groups.length === 0) {
    console.log("No groups found.");
    return;
  }
  const group = groups[groups.length - 1]; // Latest group
  
  const leaderId = group.leaderId;
  const members = group.members;
  console.log("Group ID:", group.id);
  console.log("Leader ID:", leaderId);
  console.log("Current Members:", members);
  
  // Try to find the worker that failed: 46d1bb30-a902-4656-9b88-b85234d4e61e
  const worker1 = await prisma.user.findUnique({ where: { id: "46d1bb30-a902-4656-9b88-b85234d4e61e" } });
  console.log("Worker 1 exists?", !!worker1, worker1?.role);

  // Directly check the route logic
  const existing = await prisma.groupMember.findFirst({
    where: { groupId: group.id, workerId: "46d1bb30-a902-4656-9b88-b85234d4e61e" },
  });
  console.log("Is worker already a member?", !!existing);
  
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
