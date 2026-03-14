const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('--- Verifying Database Schema ---');
    const user = await prisma.user.findFirst({
        select: { id: true, phone: true, experience: true }
    });
    console.log('✅ Success! Database query executed.');
    console.log('Sample User Data (Experience Column):', user ? (user.experience !== undefined ? 'Found' : 'Missing') : 'No users in DB');
    
    if (user && user.experience === undefined) {
        throw new Error('Column "experience" is undefined in query result');
    }

  } catch (error) {
    console.error('❌ Verification Failed:');
    console.error(error.message);
    if (error.code) console.error('Error Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
