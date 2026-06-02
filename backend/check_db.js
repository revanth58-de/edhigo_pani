const { PrismaClient } = require('@prisma/client');

async function testConnection(name, url) {
  console.log(`\nTesting connection for: ${name}`);
  console.log(`URL: ${url.replace(/:[^@]+@/, ':****@')}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Success! User count:`, userCount);
    return true;
  } catch (error) {
    console.error(`❌ Failed:`, error.message || error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  // Adding connect_timeout=30 (which defaults to 5 seconds) to allow the Neon cold start to complete
  const directWithTimeout = "postgresql://neondb_owner:npg_AyUGtPqI0RO5@ep-morning-shape-aqnxyj26.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=40&connect_timeout=30";
  const poolerWithTimeout = "postgresql://neondb_owner:npg_AyUGtPqI0RO5@ep-morning-shape-aqnxyj26-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=40&connect_timeout=30";
  
  await testConnection("Direct + 30s connect_timeout", directWithTimeout);
  await testConnection("Pooler + 30s connect_timeout", poolerWithTimeout);
}

run();
