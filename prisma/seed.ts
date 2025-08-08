import { PrismaClient, UserRole, ProjectStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password for demo user
  const hashedPassword = await bcrypt.hash('demo123456', 12);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@clientsplus.com' },
    update: {},
    create: {
      email: 'demo@clientsplus.com',
      firstName: 'Demo',
      lastName: 'User',
      phone: '+1-555-123-4567',
      company: 'Clients+ Demo',
      password: hashedPassword,
      role: UserRole.USER,
    },
  });

  console.log('✅ Demo user created:', user.email);

  // Create demo clients
  const client1 = await prisma.client.create({
    data: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-234-5678',
      company: 'Smith Enterprises',
      address: {
        street: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      notes: 'Long-term client, prefers email communication',
      userId: user.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1-555-345-6789',
      company: 'Johnson Consulting',
      address: {
        street: '456 Corporate Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
      },
      notes: 'New client, requires frequent updates',
      userId: user.id,
    },
  });

  console.log('✅ Demo clients created');

  // Create demo projects
  const project1 = await prisma.project.create({
    data: {
      title: 'Website Redesign',
      description: 'Complete redesign of company website with modern UI/UX',
      status: ProjectStatus.ACTIVE,
      budget: 15000.00,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-03-15'),
      notes: 'Client wants mobile-first approach',
      userId: user.id,
      clientId: client1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'Brand Identity Design',
      description: 'Logo design and brand guidelines development',
      status: ProjectStatus.PLANNING,
      budget: 8000.00,
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-04-01'),
      notes: 'Include social media templates',
      userId: user.id,
      clientId: client2.id,
    },
  });

  console.log('✅ Demo projects created');

  // Create demo invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      status: InvoiceStatus.SENT,
      issueDate: new Date('2024-01-20'),
      dueDate: new Date('2024-02-20'),
      subtotal: 5000.00,
      tax: 400.00,
      total: 5400.00,
      notes: 'Phase 1 development - Website structure and design',
      userId: user.id,
      clientId: client1.id,
      projectId: project1.id,
      items: {
        create: [
          {
            description: 'Website wireframes and mockups',
            quantity: 1,
            rate: 2500.00,
            amount: 2500.00,
          },
          {
            description: 'Frontend development (HTML/CSS/JS)',
            quantity: 1,
            rate: 2500.00,
            amount: 2500.00,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-002',
      status: InvoiceStatus.DRAFT,
      issueDate: new Date('2024-02-01'),
      dueDate: new Date('2024-03-01'),
      subtotal: 3000.00,
      tax: 240.00,
      total: 3240.00,
      notes: 'Initial brand consultation and logo concepts',
      userId: user.id,
      clientId: client2.id,
      projectId: project2.id,
      items: {
        create: [
          {
            description: 'Brand consultation and strategy',
            quantity: 4,
            rate: 150.00,
            amount: 600.00,
          },
          {
            description: 'Logo design concepts (3 variations)',
            quantity: 1,
            rate: 2400.00,
            amount: 2400.00,
          },
        ],
      },
    },
  });

  console.log('✅ Demo invoices created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Demo Account Details:');
  console.log('Email: demo@clientsplus.com');
  console.log('Password: demo123456');
  console.log('\n📊 Seeded Data:');
  console.log(`- 1 User`);
  console.log(`- 2 Clients`);
  console.log(`- 2 Projects`);
  console.log(`- 2 Invoices with items`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });