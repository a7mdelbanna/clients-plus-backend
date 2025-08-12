const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranch() {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        companyId: 'cme8enbvs0001vpahn8l76o5a'
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        type: true,
        status: true
      }
    });
    
    console.log('Branches found:', JSON.stringify(branches, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranch();