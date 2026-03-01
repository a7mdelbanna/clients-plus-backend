import { PrismaClient, UserRole, InvoiceStatus, PaymentMethod, PaymentStatus, AppointmentStatus, StaffStatus, AccessLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  const hashedPassword = await bcrypt.hash('demo123456', 12);

  // ========== CLEAN EXISTING DEMO DATA (in order to be idempotent) ==========
  console.log('Cleaning existing demo data...');
  const existingCompany = await prisma.company.findFirst({ where: { email: 'demo@clientsplus.com' } });
  if (existingCompany) {
    // Delete in dependency order
    await prisma.saleItem.deleteMany({ where: { sale: { companyId: existingCompany.id } } });
    await prisma.saleRefund.deleteMany({ where: { sale: { companyId: existingCompany.id } } });
    await prisma.sale.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.payment.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { companyId: existingCompany.id } } });
    await prisma.appointmentInvoice.deleteMany({ where: { appointment: { companyId: existingCompany.id } } });
    await prisma.invoice.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.appointmentReminder.deleteMany({ where: { appointment: { companyId: existingCompany.id } } });
    await prisma.appointment.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.inventoryMovement.deleteMany({ where: { product: { companyId: existingCompany.id } } });
    await prisma.inventory.deleteMany({ where: { product: { companyId: existingCompany.id } } });
    await prisma.product.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.productCategory.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.staffSchedule.deleteMany({ where: { staff: { companyId: existingCompany.id } } });
    await prisma.staffService.deleteMany({ where: { staff: { companyId: existingCompany.id } } });
    await prisma.staffBranch.deleteMany({ where: { staff: { companyId: existingCompany.id } } });
    await prisma.staffTimeOff.deleteMany({ where: { staff: { companyId: existingCompany.id } } });
    await prisma.staff.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.serviceBranch.deleteMany({ where: { service: { companyId: existingCompany.id } } });
    await prisma.service.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.serviceCategory.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.client.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.financialTransaction.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.financialAccount.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.companySetting.deleteMany({ where: { companyId: existingCompany.id } });
  }
  console.log('Existing data cleaned.');

  // ========== COMPANY ==========
  const company = await prisma.company.upsert({
    where: { email: 'demo@clientsplus.com' },
    update: { setupCompleted: true },
    create: {
      name: 'Clients+ Demo',
      email: 'demo@clientsplus.com',
      phone: '+1-555-000-0000',
      businessType: 'salon',
      currency: 'USD',
      timezone: 'America/New_York',
      setupCompleted: true,
      setupProgress: { businessInfo: true, branches: true, teamInfo: true, theme: true },
    },
  });
  console.log('Company:', company.name);

  // ========== BRANCH ==========
  const branch = await prisma.branch.upsert({
    where: { id: 'demo-main-branch' },
    update: {},
    create: {
      id: 'demo-main-branch',
      name: 'Main Branch',
      companyId: company.id,
      isMain: true,
      address: {
        street: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      phone: '+1-555-100-0000',
      operatingHours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '19:00' },
        friday: { open: '09:00', close: '19:00' },
        saturday: { open: '10:00', close: '17:00' },
        sunday: { open: null, close: null },
      },
    },
  });
  console.log('Branch:', branch.name);

  // ========== ADMIN USER ==========
  const user = await prisma.user.upsert({
    where: { email: 'admin@clientsplus.com' },
    update: {},
    create: {
      email: 'admin@clientsplus.com',
      firstName: 'Demo',
      lastName: 'Admin',
      phone: '+1-555-123-4567',
      password: hashedPassword,
      role: UserRole.ADMIN,
      companyId: company.id,
      isVerified: true,
    },
  });
  console.log('Admin user:', user.email);

  // ========== CLIENTS (8 total) ==========
  const clientsData = [
    { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com', phone: '+1-555-201-0001', gender: 'FEMALE' as const, notes: 'VIP client, prefers Saturday appointments' },
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '+1-555-201-0002', gender: 'MALE' as const, notes: 'Regular client, monthly haircut' },
    { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@example.com', phone: '+1-555-201-0003', gender: 'FEMALE' as const, notes: 'Sensitive skin, use hypoallergenic products' },
    { firstName: 'Michael', lastName: 'Brown', email: 'michael.b@example.com', phone: '+1-555-201-0004', gender: 'MALE' as const, notes: '' },
    { firstName: 'Jessica', lastName: 'Wilson', email: 'jessica.w@example.com', phone: '+1-555-201-0005', gender: 'FEMALE' as const, notes: 'Referred by Sarah Johnson' },
    { firstName: 'David', lastName: 'Martinez', email: 'david.m@example.com', phone: '+1-555-201-0006', gender: 'MALE' as const, notes: 'Prefers early morning appointments' },
    { firstName: 'Olivia', lastName: 'Taylor', email: 'olivia.t@example.com', phone: '+1-555-201-0007', gender: 'FEMALE' as const, notes: 'New client as of this month' },
    { firstName: 'Ahmed', lastName: 'Hassan', email: 'ahmed.h@example.com', phone: '+1-555-201-0008', gender: 'MALE' as const, notes: 'Prefers Arabic communication' },
  ];

  const clients = [];
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        gender: c.gender,
        notes: c.notes || undefined,
        companyId: company.id,
        createdById: user.id,
        marketingConsent: Math.random() > 0.3,
      },
    });
    clients.push(client);
  }
  console.log(`Clients created: ${clients.length}`);

  // ========== SERVICE CATEGORIES ==========
  const catHair = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Hair Services', nameAr: 'خدمات الشعر', color: '#FF6B6B', order: 1 },
  });
  const catSkin = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Skin Care', nameAr: 'العناية بالبشرة', color: '#4ECDC4', order: 2 },
  });
  const catNails = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Nail Services', nameAr: 'خدمات الأظافر', color: '#FFE66D', order: 3 },
  });
  console.log('Service categories created: 3');

  // ========== SERVICES ==========
  const servicesData = [
    { name: 'Haircut & Styling', nameAr: 'قص وتصفيف الشعر', categoryId: catHair.id, price: 45, duration: 45, color: '#FF6B6B' },
    { name: 'Hair Coloring', nameAr: 'صبغ الشعر', categoryId: catHair.id, price: 120, duration: 90, color: '#FF8E8E' },
    { name: 'Blowout', nameAr: 'تجفيف الشعر', categoryId: catHair.id, price: 35, duration: 30, color: '#FF4444' },
    { name: 'Deep Conditioning', nameAr: 'ترطيب عميق', categoryId: catHair.id, price: 55, duration: 45, color: '#CC5555' },
    { name: 'Facial Treatment', nameAr: 'علاج الوجه', categoryId: catSkin.id, price: 80, duration: 60, color: '#4ECDC4' },
    { name: 'Skin Cleansing', nameAr: 'تنظيف البشرة', categoryId: catSkin.id, price: 65, duration: 45, color: '#45B7AA' },
    { name: 'Manicure', nameAr: 'مانيكير', categoryId: catNails.id, price: 30, duration: 30, color: '#FFE66D' },
    { name: 'Pedicure', nameAr: 'باديكير', categoryId: catNails.id, price: 40, duration: 45, color: '#FFD700' },
    { name: 'Gel Nails', nameAr: 'أظافر جل', categoryId: catNails.id, price: 55, duration: 60, color: '#FFC107' },
  ];

  const services: any[] = [];
  for (let i = 0; i < servicesData.length; i++) {
    const s = servicesData[i];
    const service = await prisma.service.create({
      data: {
        companyId: company.id,
        name: s.name,
        nameAr: s.nameAr,
        categoryId: s.categoryId,
        startingPrice: s.price,
        duration: { hours: Math.floor(s.duration / 60), minutes: s.duration % 60 },
        color: s.color,
        order: i + 1,
        onlineBooking: { enabled: true, requireDeposit: false },
        active: true,
      },
    });
    services.push(service);

    // Link service to branch
    await prisma.serviceBranch.create({
      data: { serviceId: service.id, branchId: branch.id },
    });
  }
  console.log(`Services created: ${services.length}`);

  // ========== STAFF (4 members) ==========
  const staffData = [
    { name: 'Maria Garcia', firstName: 'Maria', lastName: 'Garcia', email: 'maria.g@clientsplus.com', phone: '+1-555-301-0001', position: 'Senior Stylist', positionId: 'pos-senior-stylist', color: '#FF6B6B', serviceIndices: [0, 1, 2, 3] },
    { name: 'James Lee', firstName: 'James', lastName: 'Lee', email: 'james.l@clientsplus.com', phone: '+1-555-301-0002', position: 'Stylist', positionId: 'pos-stylist', color: '#4ECDC4', serviceIndices: [0, 2, 3] },
    { name: 'Fatima Al-Rashid', firstName: 'Fatima', lastName: 'Al-Rashid', email: 'fatima.r@clientsplus.com', phone: '+1-555-301-0003', position: 'Skin Specialist', positionId: 'pos-skin-specialist', color: '#9B59B6', serviceIndices: [4, 5] },
    { name: 'Lisa Chen', firstName: 'Lisa', lastName: 'Chen', email: 'lisa.c@clientsplus.com', phone: '+1-555-301-0004', position: 'Nail Technician', positionId: 'pos-nail-tech', color: '#FFE66D', serviceIndices: [6, 7, 8] },
  ];

  const staffMembers = [];
  for (let i = 0; i < staffData.length; i++) {
    const s = staffData[i];
    const staff = await prisma.staff.create({
      data: {
        companyId: company.id,
        name: s.name,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        position: s.position,
        positionId: s.positionId,
        primaryBranchId: branch.id,
        color: s.color,
        status: StaffStatus.ACTIVE,
        accessLevel: i === 0 ? AccessLevel.MANAGER : AccessLevel.EMPLOYEE,
        onlineBookingEnabled: true,
        commissionRate: 0.15,
        hourlyRate: i === 0 ? 35 : 25,
        order: i + 1,
        servicesCount: s.serviceIndices.length,
      },
    });
    staffMembers.push(staff);

    // Assign to branch
    await prisma.staffBranch.create({
      data: { staffId: staff.id, branchId: branch.id, isPrimary: true },
    });

    // Link to services
    for (const si of s.serviceIndices) {
      await prisma.staffService.create({
        data: { staffId: staff.id, serviceId: services[si].id },
      });
    }

    // Create weekly schedule (Mon-Fri 9-18, Sat 10-15)
    const scheduleStart = new Date('2026-01-01');
    for (let day = 1; day <= 6; day++) {
      await prisma.staffSchedule.create({
        data: {
          staffId: staff.id,
          branchId: branch.id,
          dayOfWeek: day,
          startTime: day === 6 ? '10:00' : '09:00',
          endTime: day === 6 ? '15:00' : '18:00',
          startDate: scheduleStart,
          isWorking: true,
          breaks: day !== 6 ? [{ start: '13:00', end: '14:00', label: 'Lunch' }] : [],
        },
      });
    }
    // Sunday off
    await prisma.staffSchedule.create({
      data: {
        staffId: staff.id,
        branchId: branch.id,
        dayOfWeek: 0,
        startTime: '00:00',
        endTime: '00:00',
        startDate: scheduleStart,
        isWorking: false,
      },
    });
  }
  console.log(`Staff created: ${staffMembers.length}`);

  // ========== PRODUCT CATEGORIES ==========
  const prodCatHair = await prisma.productCategory.create({
    data: { companyId: company.id, name: 'Hair Products', nameAr: 'منتجات الشعر', color: '#FF6B6B', order: 1 },
  });
  const prodCatSkin = await prisma.productCategory.create({
    data: { companyId: company.id, name: 'Skin Products', nameAr: 'منتجات البشرة', color: '#4ECDC4', order: 2 },
  });
  const prodCatNail = await prisma.productCategory.create({
    data: { companyId: company.id, name: 'Nail Products', nameAr: 'منتجات الأظافر', color: '#FFE66D', order: 3 },
  });
  console.log('Product categories created: 3');

  // ========== PRODUCTS ==========
  const productsData = [
    { name: 'Professional Shampoo', nameAr: 'شامبو احترافي', sku: 'HAIR-001', price: 24.99, cost: 12.00, stock: 45, categoryId: prodCatHair.id, lowStockThreshold: 10 },
    { name: 'Hair Conditioner', nameAr: 'بلسم الشعر', sku: 'HAIR-002', price: 22.99, cost: 10.00, stock: 38, categoryId: prodCatHair.id, lowStockThreshold: 10 },
    { name: 'Hair Serum', nameAr: 'سيروم الشعر', sku: 'HAIR-003', price: 34.99, cost: 15.00, stock: 25, categoryId: prodCatHair.id, lowStockThreshold: 5 },
    { name: 'Hair Styling Gel', nameAr: 'جل تصفيف الشعر', sku: 'HAIR-004', price: 18.99, cost: 8.00, stock: 60, categoryId: prodCatHair.id, lowStockThreshold: 15 },
    { name: 'Moisturizing Cream', nameAr: 'كريم مرطب', sku: 'SKIN-001', price: 42.99, cost: 18.00, stock: 30, categoryId: prodCatSkin.id, lowStockThreshold: 8 },
    { name: 'Face Cleanser', nameAr: 'غسول الوجه', sku: 'SKIN-002', price: 28.99, cost: 12.00, stock: 35, categoryId: prodCatSkin.id, lowStockThreshold: 10 },
    { name: 'Sunscreen SPF 50', nameAr: 'واقي شمس', sku: 'SKIN-003', price: 19.99, cost: 8.00, stock: 50, categoryId: prodCatSkin.id, lowStockThreshold: 12 },
    { name: 'Gel Nail Polish Set', nameAr: 'طقم طلاء أظافر جل', sku: 'NAIL-001', price: 15.99, cost: 6.00, stock: 40, categoryId: prodCatNail.id, lowStockThreshold: 10 },
    { name: 'Nail Care Kit', nameAr: 'طقم العناية بالأظافر', sku: 'NAIL-002', price: 29.99, cost: 12.00, stock: 20, categoryId: prodCatNail.id, lowStockThreshold: 5 },
    { name: 'Cuticle Oil', nameAr: 'زيت الأظافر', sku: 'NAIL-003', price: 12.99, cost: 4.00, stock: 55, categoryId: prodCatNail.id, lowStockThreshold: 15 },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        name: p.name,
        nameAr: p.nameAr,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        categoryId: p.categoryId,
        lowStockThreshold: p.lowStockThreshold,
        trackInventory: true,
        active: true,
      },
    });
    products.push(product);

    // Create inventory record for branch
    await prisma.inventory.create({
      data: {
        productId: product.id,
        branchId: branch.id,
        quantity: p.stock,
        lastRestocked: new Date(),
      },
    });

    // Create initial stock-in movement
    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        branchId: branch.id,
        type: 'IN',
        quantity: p.stock,
        notes: 'Initial stock',
        unitCost: p.cost,
      },
    });
  }
  console.log(`Products created: ${products.length}`);

  // ========== APPOINTMENTS (18 — past, today, and upcoming) ==========
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  const appointmentsData = [
    // Past completed appointments
    { clientIdx: 0, staffIdx: 0, serviceIdx: 0, dayOffset: -14, startHour: 10, status: 'COMPLETED' as const },
    { clientIdx: 1, staffIdx: 1, serviceIdx: 0, dayOffset: -13, startHour: 11, status: 'COMPLETED' as const },
    { clientIdx: 2, staffIdx: 2, serviceIdx: 4, dayOffset: -12, startHour: 14, status: 'COMPLETED' as const },
    { clientIdx: 3, staffIdx: 0, serviceIdx: 1, dayOffset: -10, startHour: 9, status: 'COMPLETED' as const },
    { clientIdx: 4, staffIdx: 3, serviceIdx: 6, dayOffset: -9, startHour: 15, status: 'COMPLETED' as const },
    { clientIdx: 5, staffIdx: 1, serviceIdx: 2, dayOffset: -7, startHour: 10, status: 'COMPLETED' as const },
    { clientIdx: 6, staffIdx: 2, serviceIdx: 5, dayOffset: -5, startHour: 11, status: 'COMPLETED' as const },
    { clientIdx: 7, staffIdx: 0, serviceIdx: 0, dayOffset: -3, startHour: 16, status: 'COMPLETED' as const },
    { clientIdx: 0, staffIdx: 3, serviceIdx: 7, dayOffset: -2, startHour: 13, status: 'COMPLETED' as const },
    { clientIdx: 1, staffIdx: 0, serviceIdx: 3, dayOffset: -1, startHour: 10, status: 'COMPLETED' as const },
    // Today
    { clientIdx: 2, staffIdx: 1, serviceIdx: 0, dayOffset: 0, startHour: 10, status: 'CONFIRMED' as const },
    { clientIdx: 3, staffIdx: 2, serviceIdx: 4, dayOffset: 0, startHour: 14, status: 'CONFIRMED' as const },
    { clientIdx: 4, staffIdx: 0, serviceIdx: 1, dayOffset: 0, startHour: 15, status: 'SCHEDULED' as const },
    // Upcoming
    { clientIdx: 5, staffIdx: 3, serviceIdx: 8, dayOffset: 1, startHour: 11, status: 'SCHEDULED' as const },
    { clientIdx: 6, staffIdx: 0, serviceIdx: 0, dayOffset: 2, startHour: 9, status: 'SCHEDULED' as const },
    { clientIdx: 7, staffIdx: 1, serviceIdx: 2, dayOffset: 3, startHour: 14, status: 'SCHEDULED' as const },
    { clientIdx: 0, staffIdx: 2, serviceIdx: 5, dayOffset: 5, startHour: 10, status: 'PENDING' as const },
    { clientIdx: 1, staffIdx: 3, serviceIdx: 7, dayOffset: 7, startHour: 16, status: 'PENDING' as const },
  ];

  const appointments = [];
  for (const a of appointmentsData) {
    const client = clients[a.clientIdx];
    const staff = staffMembers[a.staffIdx];
    const service = services[a.serviceIdx];
    const serviceData = servicesData[a.serviceIdx];
    const appointmentDate = addDays(today, a.dayOffset);
    const startTime = `${String(a.startHour).padStart(2, '0')}:00`;
    const endMinutes = a.startHour * 60 + serviceData.duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const appointment = await prisma.appointment.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        clientId: client.id,
        staffId: staff.id,
        clientName: `${client.firstName} ${client.lastName}`,
        clientPhone: client.phone || '',
        clientEmail: client.email,
        staffName: staff.name,
        date: appointmentDate,
        startTime,
        endTime,
        duration: serviceData.duration,
        totalDuration: serviceData.duration,
        totalPrice: serviceData.price,
        paidAmount: a.status === 'COMPLETED' ? serviceData.price : 0,
        paymentStatus: a.status === 'COMPLETED' ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
        status: a.status as AppointmentStatus,
        services: [{ serviceId: service.id, name: service.name, price: serviceData.price, duration: serviceData.duration }],
        source: 'DASHBOARD',
        title: `${service.name} - ${client.firstName}`,
        color: staff.color,
      },
    });
    appointments.push(appointment);
  }
  console.log(`Appointments created: ${appointments.length}`);

  // ========== INVOICES (6 total — mix of statuses) ==========
  const invoicesData = [
    { clientIdx: 0, number: 'INV-2026-001', status: InvoiceStatus.PAID, daysAgo: 30, subtotal: 165, items: [{ desc: 'Haircut & Styling', qty: 1, price: 45 }, { desc: 'Hair Coloring', qty: 1, price: 120 }] },
    { clientIdx: 1, number: 'INV-2026-002', status: InvoiceStatus.PAID, daysAgo: 25, subtotal: 80, items: [{ desc: 'Haircut & Styling', qty: 1, price: 45 }, { desc: 'Blowout', qty: 1, price: 35 }] },
    { clientIdx: 2, number: 'INV-2026-003', status: InvoiceStatus.PAID, daysAgo: 20, subtotal: 145, items: [{ desc: 'Facial Treatment', qty: 1, price: 80 }, { desc: 'Skin Cleansing', qty: 1, price: 65 }] },
    { clientIdx: 3, number: 'INV-2026-004', status: InvoiceStatus.SENT, daysAgo: 10, subtotal: 175, items: [{ desc: 'Hair Coloring', qty: 1, price: 120 }, { desc: 'Deep Conditioning', qty: 1, price: 55 }] },
    { clientIdx: 4, number: 'INV-2026-005', status: InvoiceStatus.SENT, daysAgo: 5, subtotal: 125, items: [{ desc: 'Gel Nails', qty: 1, price: 55 }, { desc: 'Manicure', qty: 1, price: 30 }, { desc: 'Pedicure', qty: 1, price: 40 }] },
    { clientIdx: 5, number: 'INV-2026-006', status: InvoiceStatus.DRAFT, daysAgo: 1, subtotal: 45, items: [{ desc: 'Haircut & Styling', qty: 1, price: 45 }] },
  ];

  const invoices = [];
  for (const inv of invoicesData) {
    const client = clients[inv.clientIdx];
    const taxRate = 0.08;
    const taxAmount = Math.round(inv.subtotal * taxRate * 100) / 100;
    const total = inv.subtotal + taxAmount;
    const issueDate = addDays(today, -inv.daysAgo);
    const dueDate = addDays(issueDate, 30);

    const invoice = await prisma.invoice.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        clientId: client.id,
        createdById: user.id,
        invoiceNumber: inv.number,
        status: inv.status,
        issueDate,
        dueDate,
        subtotal: inv.subtotal,
        taxRate,
        taxAmount,
        total,
        paidAmount: inv.status === InvoiceStatus.PAID ? total : 0,
        balanceAmount: inv.status === InvoiceStatus.PAID ? 0 : total,
        paymentStatus: inv.status === InvoiceStatus.PAID ? PaymentStatus.PAID : PaymentStatus.PENDING,
        items: {
          create: inv.items.map((item, idx) => ({
            description: item.desc,
            quantity: item.qty,
            unitPrice: item.price,
            total: item.qty * item.price,
            type: 'service',
            order: idx,
          })),
        },
      },
    });
    invoices.push(invoice);
  }
  console.log(`Invoices created: ${invoices.length}`);

  // ========== PAYMENTS (for paid invoices) ==========
  let paymentCount = 0;
  for (let i = 0; i < invoices.length; i++) {
    if (invoicesData[i].status === InvoiceStatus.PAID) {
      const inv = invoices[i];
      const client = clients[invoicesData[i].clientIdx];
      await prisma.payment.create({
        data: {
          companyId: company.id,
          invoiceId: inv.id,
          clientId: client.id,
          amount: inv.total,
          paymentMethod: i % 2 === 0 ? PaymentMethod.CASH : PaymentMethod.CREDIT_CARD,
          paymentDate: addDays(today, -invoicesData[i].daysAgo + 2),
          status: PaymentStatus.COMPLETED,
          createdById: user.id,
          notes: `Payment for ${invoicesData[i].number}`,
        },
      });
      paymentCount++;
    }
  }
  console.log(`Payments created: ${paymentCount}`);

  // ========== SALES (8 recent POS sales) ==========
  const salesData = [
    { clientIdx: 0, staffIdx: 0, daysAgo: 14, items: [{ name: 'Haircut & Styling', price: 45, qty: 1, type: 'SERVICE' as const, serviceIdx: 0 }] },
    { clientIdx: 1, staffIdx: 1, daysAgo: 12, items: [{ name: 'Professional Shampoo', price: 24.99, qty: 1, type: 'PRODUCT' as const, productIdx: 0 }, { name: 'Haircut & Styling', price: 45, qty: 1, type: 'SERVICE' as const, serviceIdx: 0 }] },
    { clientIdx: 2, staffIdx: 2, daysAgo: 10, items: [{ name: 'Facial Treatment', price: 80, qty: 1, type: 'SERVICE' as const, serviceIdx: 4 }, { name: 'Moisturizing Cream', price: 42.99, qty: 1, type: 'PRODUCT' as const, productIdx: 4 }] },
    { clientIdx: 3, staffIdx: 0, daysAgo: 7, items: [{ name: 'Hair Coloring', price: 120, qty: 1, type: 'SERVICE' as const, serviceIdx: 1 }] },
    { clientIdx: 4, staffIdx: 3, daysAgo: 5, items: [{ name: 'Manicure', price: 30, qty: 1, type: 'SERVICE' as const, serviceIdx: 6 }, { name: 'Pedicure', price: 40, qty: 1, type: 'SERVICE' as const, serviceIdx: 7 }] },
    { clientIdx: 5, staffIdx: 1, daysAgo: 3, items: [{ name: 'Blowout', price: 35, qty: 1, type: 'SERVICE' as const, serviceIdx: 2 }, { name: 'Hair Serum', price: 34.99, qty: 1, type: 'PRODUCT' as const, productIdx: 2 }] },
    { clientIdx: 6, staffIdx: 2, daysAgo: 1, items: [{ name: 'Skin Cleansing', price: 65, qty: 1, type: 'SERVICE' as const, serviceIdx: 5 }] },
    { clientIdx: 7, staffIdx: 0, daysAgo: 0, items: [{ name: 'Haircut & Styling', price: 45, qty: 1, type: 'SERVICE' as const, serviceIdx: 0 }, { name: 'Hair Styling Gel', price: 18.99, qty: 2, type: 'PRODUCT' as const, productIdx: 3 }] },
  ];

  for (let i = 0; i < salesData.length; i++) {
    const s = salesData[i];
    const subtotal = s.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const saleDate = addDays(today, -s.daysAgo);

    await prisma.sale.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        clientId: clients[s.clientIdx].id,
        staffId: staffMembers[s.staffIdx].id,
        saleNumber: `SALE-${String(i + 1).padStart(4, '0')}`,
        saleDate,
        subtotal,
        taxAmount,
        total,
        amountPaid: total,
        paymentMethod: i % 3 === 0 ? PaymentMethod.CASH : i % 3 === 1 ? PaymentMethod.CREDIT_CARD : PaymentMethod.DEBIT_CARD,
        paymentStatus: PaymentStatus.COMPLETED,
        status: 'COMPLETED',
        createdBy: user.id,
        items: {
          create: s.items.map((item, idx) => ({
            name: item.name,
            unitPrice: item.price,
            quantity: item.qty,
            lineTotal: item.price * item.qty,
            taxRate: 0.08,
            taxAmount: Math.round(item.price * item.qty * 0.08 * 100) / 100,
            type: item.type,
            productId: 'productIdx' in item ? products[(item as any).productIdx].id : undefined,
            serviceId: 'serviceIdx' in item ? services[(item as any).serviceIdx].id : undefined,
          })),
        },
      },
    });
  }
  console.log(`Sales created: ${salesData.length}`);

  // ========== FINANCIAL ACCOUNTS ==========
  const cashAccount = await prisma.financialAccount.create({
    data: {
      companyId: company.id,
      branchId: branch.id,
      name: 'Cash Register',
      accountType: 'CASH',
      balance: 2850.00,
      initialBalance: 500.00,
      availableBalance: 2850.00,
      currency: 'USD',
      isDefault: true,
    },
  });

  const bankAccount = await prisma.financialAccount.create({
    data: {
      companyId: company.id,
      branchId: branch.id,
      name: 'Business Checking',
      accountType: 'CHECKING',
      balance: 15420.50,
      initialBalance: 10000.00,
      availableBalance: 15420.50,
      currency: 'USD',
      bankName: 'Chase Bank',
      accountNumber: '****4567',
    },
  });
  console.log('Financial accounts created: 2');

  // ========== FINANCIAL TRANSACTIONS ==========
  const txnData = [
    { type: 'INCOME' as const, amount: 165, desc: 'Invoice INV-2026-001 payment', daysAgo: 28, accountId: cashAccount.id, category: 'Services' },
    { type: 'INCOME' as const, amount: 80, desc: 'Invoice INV-2026-002 payment', daysAgo: 23, accountId: bankAccount.id, category: 'Services' },
    { type: 'INCOME' as const, amount: 145, desc: 'Invoice INV-2026-003 payment', daysAgo: 18, accountId: cashAccount.id, category: 'Services' },
    { type: 'INCOME' as const, amount: 69.99, desc: 'Product sales - Hair products', daysAgo: 12, accountId: cashAccount.id, category: 'Products' },
    { type: 'INCOME' as const, amount: 122.99, desc: 'Product sales - Skin & Hair', daysAgo: 10, accountId: bankAccount.id, category: 'Products' },
    { type: 'EXPENSE' as const, amount: 450, desc: 'Salon supplies restock', daysAgo: 15, accountId: bankAccount.id, category: 'Supplies' },
    { type: 'EXPENSE' as const, amount: 1200, desc: 'Monthly rent', daysAgo: 1, accountId: bankAccount.id, category: 'Rent' },
    { type: 'INCOME' as const, amount: 82.98, desc: 'Walk-in sale', daysAgo: 0, accountId: cashAccount.id, category: 'Services' },
  ];

  for (const txn of txnData) {
    await prisma.financialTransaction.create({
      data: {
        companyId: company.id,
        accountId: txn.accountId,
        branchId: branch.id,
        type: txn.type,
        amount: txn.amount,
        description: txn.desc,
        category: txn.category,
        transactionDate: addDays(today, -txn.daysAgo),
        status: 'COMPLETED',
        currency: 'USD',
      },
    });
  }
  console.log(`Financial transactions created: ${txnData.length}`);

  // ========== COMPANY SETTINGS ==========
  await prisma.companySetting.createMany({
    data: [
      { companyId: company.id, key: 'appointment.defaultDuration', value: JSON.stringify(30), category: 'appointments' },
      { companyId: company.id, key: 'appointment.allowOnlineBooking', value: JSON.stringify(true), category: 'appointments' },
      { companyId: company.id, key: 'notifications.email', value: JSON.stringify(true), category: 'notifications' },
      { companyId: company.id, key: 'notifications.sms', value: JSON.stringify(false), category: 'notifications' },
      { companyId: company.id, key: 'invoice.currency', value: JSON.stringify('USD'), category: 'invoices' },
      { companyId: company.id, key: 'invoice.taxRate', value: JSON.stringify(0.08), category: 'invoices' },
    ],
  });
  console.log('Company settings created: 6');

  // ========== SUMMARY ==========
  console.log('\n========================================');
  console.log('Database seeding completed successfully!');
  console.log('========================================');
  console.log('\nDemo Account:');
  console.log('  Email:    admin@clientsplus.com');
  console.log('  Password: demo123456');
  console.log('\nSeeded Data:');
  console.log('  - 1 Company (Clients+ Demo)');
  console.log('  - 1 Branch (Main Branch)');
  console.log('  - 1 Admin User');
  console.log(`  - ${clients.length} Clients`);
  console.log('  - 3 Service Categories');
  console.log(`  - ${services.length} Services`);
  console.log(`  - ${staffMembers.length} Staff Members (with schedules)`);
  console.log('  - 3 Product Categories');
  console.log(`  - ${products.length} Products (with inventory)`);
  console.log(`  - ${appointments.length} Appointments`);
  console.log(`  - ${invoices.length} Invoices`);
  console.log(`  - ${paymentCount} Payments`);
  console.log(`  - ${salesData.length} Sales`);
  console.log('  - 2 Financial Accounts');
  console.log(`  - ${txnData.length} Financial Transactions`);
  console.log('  - 6 Company Settings');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
