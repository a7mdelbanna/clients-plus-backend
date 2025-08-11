const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Check if test company exists
    let company = await prisma.company.findFirst({
      where: { email: 'admin@test.com' }
    });
    
    if (!company) {
      // Create test company
      company = await prisma.company.create({
        data: {
          name: 'Test Company',
          email: 'admin@test.com',
          phone: '+1234567890',
          industry: 'BEAUTY_SALON',
          status: 'ACTIVE',
          isSetupComplete: true,
          settings: {
            businessHours: {
              monday: { open: '09:00', close: '17:00', isOpen: true },
              tuesday: { open: '09:00', close: '17:00', isOpen: true },
              wednesday: { open: '09:00', close: '17:00', isOpen: true },
              thursday: { open: '09:00', close: '17:00', isOpen: true },
              friday: { open: '09:00', close: '17:00', isOpen: true },
              saturday: { open: '09:00', close: '17:00', isOpen: false },
              sunday: { open: '09:00', close: '17:00', isOpen: false }
            }
          }
        }
      });
      console.log('✓ Test company created:', company.id);
    } else {
      console.log('✓ Test company exists:', company.id);
    }
    
    // Check if test user exists
    let user = await prisma.user.findFirst({
      where: { email: 'admin@test.com' }
    });
    
    if (!user) {
      // Create test user
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      user = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'Admin',
          role: 'OWNER',
          isEmailVerified: true,
          companyId: company.id,
          isActive: true
        }
      });
      console.log('✓ Test user created:', user.id);
    } else {
      console.log('✓ Test user exists:', user.id);
    }
    
    // Create a test branch
    let branch = await prisma.branch.findFirst({
      where: { companyId: company.id }
    });
    
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: 'Main Branch',
          companyId: company.id,
          address: '123 Test Street, Test City',
          phone: '+1234567890',
          isActive: true,
          settings: {
            appointmentDuration: 30,
            bufferTime: 10,
            maxAdvanceBooking: 30
          }
        }
      });
      console.log('✓ Test branch created:', branch.id);
    } else {
      console.log('✓ Test branch exists:', branch.id);
    }
    
    // Create a test service
    let service = await prisma.service.findFirst({
      where: { companyId: company.id }
    });
    
    if (!service) {
      service = await prisma.service.create({
        data: {
          name: 'Test Service',
          description: 'A test service',
          duration: 60,
          price: 100,
          companyId: company.id,
          branchId: branch.id,
          isActive: true
        }
      });
      console.log('✓ Test service created:', service.id);
    } else {
      console.log('✓ Test service exists:', service.id);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();