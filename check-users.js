const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateUser() {
  try {
    // Check if any users exist
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('Existing users:', users);

    if (users.length === 0) {
      console.log('\nNo users found. Creating a test company and user...');

      // Create a test company first
      const company = await prisma.company.create({
        data: {
          name: 'Test Financial Company',
          email: 'finance-test@example.com',
          businessType: 'service',
          currency: 'EGP'
        }
      });

      console.log('Company created:', company.name);

      // Hash password
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Create admin user
      const user = await prisma.user.create({
        data: {
          email: 'finance-admin@example.com',
          firstName: 'Finance',
          lastName: 'Admin',
          password: hashedPassword,
          companyId: company.id,
          role: 'ADMIN',
          isVerified: true
        }
      });

      console.log('User created:', user.email);
      console.log('\nTest credentials:');
      console.log('Email: finance-admin@example.com');
      console.log('Password: password123');

    } else {
      console.log('\nExisting user found. Creating a new test user with known credentials...');

      // Check if our test user already exists
      const existingTestUser = await prisma.user.findUnique({
        where: { email: 'finance-test@example.com' }
      });

      if (!existingTestUser) {
        // Use the first company for our test user
        const firstCompany = users[0].company;

        // Hash password
        const hashedPassword = await bcrypt.hash('testpass123', 10);

        // Create test user
        const testUser = await prisma.user.create({
          data: {
            email: 'finance-test@example.com',
            firstName: 'Finance',
            lastName: 'Test',
            password: hashedPassword,
            companyId: firstCompany.id,
            role: 'ADMIN',
            isVerified: true
          }
        });

        console.log('Test user created:', testUser.email);
      }

      console.log('\nTest credentials:');
      console.log('Email: finance-test@example.com');
      console.log('Password: testpass123');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUser();