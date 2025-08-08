import { faker } from '@faker-js/faker';
import { 
  UserRole, 
  SubscriptionPlan, 
  BranchType, 
  BranchStatus, 
  ClientStatus, 
  StaffStatus, 
  AppointmentStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  Gender,
  CommunicationMethod
} from '@prisma/client';

/**
 * Test data factories for generating consistent test data
 */
export class TestDataFactory {
  /**
   * Generate a test company
   */
  static createCompany(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
      },
      businessType: faker.company.buzzPhrase(),
      taxId: faker.string.alphanumeric(10),
      registrationNumber: faker.string.alphanumeric(12),
      subscriptionPlan: faker.helpers.enumValue(SubscriptionPlan),
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: '12h',
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate a test user
   */
  static createUser(companyId: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      password: '$2b$04$9O8QT0Z7QY.X1Q7ZZ7Z7ZuQ', // "password" hashed with bcrypt rounds 4
      companyId,
      role: faker.helpers.enumValue(UserRole),
      isActive: true,
      isVerified: faker.datatype.boolean(),
      ...overrides,
    };
  }

  /**
   * Generate a test admin user
   */
  static createAdminUser(companyId: string, overrides: any = {}) {
    return this.createUser(companyId, {
      role: UserRole.ADMIN,
      isVerified: true,
      ...overrides,
    });
  }

  /**
   * Generate a test branch
   */
  static createBranch(companyId: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Branch',
      companyId,
      type: faker.helpers.enumValue(BranchType),
      status: faker.helpers.enumValue(BranchStatus),
      isMain: overrides.type === BranchType.MAIN || false,
      isActive: overrides.status === BranchStatus.ACTIVE || true,
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
      },
      phone: faker.phone.number(),
      email: faker.internet.email().toLowerCase(),
      coordinates: {
        lat: parseFloat(faker.location.latitude()),
        lng: parseFloat(faker.location.longitude()),
      },
      operatingHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '10:00', close: '15:00', closed: false },
        sunday: { closed: true },
      },
      ...overrides,
    };
  }

  /**
   * Generate a test client
   */
  static createClient(companyId: string, createdById: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      companyId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      dateOfBirth: faker.date.past({ years: 50 }),
      gender: faker.helpers.enumValue(Gender),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
      },
      preferredLanguage: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
      preferredCommunication: faker.helpers.enumValue(CommunicationMethod),
      allergies: faker.lorem.sentence(),
      medicalConditions: faker.lorem.sentence(),
      notes: faker.lorem.paragraph(),
      marketingConsent: faker.datatype.boolean(),
      status: faker.helpers.enumValue(ClientStatus),
      isActive: true,
      createdById,
      ...overrides,
    };
  }

  /**
   * Generate a test staff member
   */
  static createStaff(companyId: string, branchId: string, overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      companyId,
      branchId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      employeeId: faker.string.alphanumeric(8),
      position: faker.person.jobTitle(),
      department: faker.commerce.department(),
      hireDate: faker.date.past({ years: 5 }),
      specializations: [
        faker.helpers.arrayElement(['Massage', 'Facial', 'Manicure', 'Haircut', 'Coloring']),
        faker.helpers.arrayElement(['Deep Tissue', 'Swedish', 'Sports', 'Relaxation']),
      ],
      qualifications: faker.lorem.sentence(),
      bio: faker.lorem.paragraph(),
      workSchedule: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '10:00', end: '15:00', available: true },
        sunday: { available: false },
      },
      commissionRate: faker.number.float({ min: 0.1, max: 0.5, fractionDigits: 2 }),
      hourlyRate: faker.number.float({ min: 15, max: 50, fractionDigits: 2 }),
      status: faker.helpers.enumValue(StaffStatus),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate a test service
   */
  static createService(companyId: string, overrides: any = {}) {
    const duration = faker.helpers.arrayElement([30, 45, 60, 90, 120]);
    return {
      id: faker.string.uuid(),
      companyId,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      category: faker.helpers.arrayElement(['Massage', 'Facial', 'Hair', 'Nails', 'Wellness']),
      price: faker.number.float({ min: 25, max: 200, fractionDigits: 2 }),
      duration,
      maxAdvanceBooking: faker.number.int({ min: 7, max: 90 }),
      minAdvanceBooking: faker.number.int({ min: 1, max: 24 }),
      bufferTime: faker.helpers.arrayElement([0, 15, 30]),
      isActive: true,
      isOnline: faker.datatype.boolean({ probability: 0.3 }),
      roomRequired: faker.datatype.boolean({ probability: 0.7 }),
      equipmentRequired: faker.helpers.arrayElement([null, 'Massage Table', 'Steam Room', 'Special Equipment']),
      color: faker.color.rgb(),
      ...overrides,
    };
  }

  /**
   * Generate a test appointment
   */
  static createAppointment(
    companyId: string, 
    clientId: string, 
    staffId: string, 
    serviceId: string, 
    branchId: string, 
    createdById: string,
    overrides: any = {}
  ) {
    const startTime = faker.date.future();
    const duration = faker.helpers.arrayElement([30, 45, 60, 90, 120]);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    return {
      id: faker.string.uuid(),
      companyId,
      clientId,
      staffId,
      serviceId,
      branchId,
      title: faker.lorem.words(3),
      startTime,
      endTime,
      notes: faker.lorem.sentence(),
      internalNotes: faker.lorem.sentence(),
      status: faker.helpers.enumValue(AppointmentStatus),
      reminderSent: faker.datatype.boolean(),
      price: faker.number.float({ min: 25, max: 200, fractionDigits: 2 }),
      createdById,
      ...overrides,
    };
  }

  /**
   * Generate a test invoice
   */
  static createInvoice(companyId: string, clientId: string, createdById: string, overrides: any = {}) {
    const subtotal = faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
    const taxRate = 0.1;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return {
      id: faker.string.uuid(),
      companyId,
      clientId,
      invoiceNumber: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
      title: faker.commerce.productName(),
      issueDate: new Date(),
      dueDate: faker.date.future(),
      subtotal,
      taxRate,
      taxAmount,
      discountAmount: 0,
      total,
      status: faker.helpers.enumValue(InvoiceStatus),
      paidAmount: overrides.status === InvoiceStatus.PAID ? total : 0,
      notes: faker.lorem.sentence(),
      terms: faker.lorem.paragraph(),
      createdById,
      ...overrides,
    };
  }

  /**
   * Generate a test payment
   */
  static createPayment(
    companyId: string, 
    clientId: string, 
    createdById: string,
    invoiceId?: string, 
    overrides: any = {}
  ) {
    return {
      id: faker.string.uuid(),
      companyId,
      clientId,
      invoiceId: invoiceId || null,
      amount: faker.number.float({ min: 25, max: 500, fractionDigits: 2 }),
      paymentDate: new Date(),
      paymentMethod: faker.helpers.enumValue(PaymentMethod),
      transactionId: faker.string.uuid(),
      paymentGateway: faker.helpers.arrayElement(['stripe', 'paypal', 'square', null]),
      status: faker.helpers.enumValue(PaymentStatus),
      notes: faker.lorem.sentence(),
      createdById,
      ...overrides,
    };
  }

  /**
   * Generate a complete test dataset for a company
   */
  static async createCompanyDataset() {
    const company = this.createCompany();
    const adminUser = this.createAdminUser(company.id);
    const branch = this.createBranch(company.id, { type: BranchType.MAIN });
    
    const users = [
      adminUser,
      this.createUser(company.id, { role: UserRole.MANAGER }),
      this.createUser(company.id, { role: UserRole.STAFF }),
    ];

    const staff = [
      this.createStaff(company.id, branch.id),
      this.createStaff(company.id, branch.id),
      this.createStaff(company.id, branch.id),
    ];

    const services = [
      this.createService(company.id, { category: 'Massage', duration: 60 }),
      this.createService(company.id, { category: 'Facial', duration: 45 }),
      this.createService(company.id, { category: 'Hair', duration: 90 }),
    ];

    const clients = [
      this.createClient(company.id, adminUser.id),
      this.createClient(company.id, adminUser.id),
      this.createClient(company.id, adminUser.id),
    ];

    return {
      company,
      users,
      branch,
      staff,
      services,
      clients,
    };
  }

  /**
   * Generate test data for multi-tenant scenarios
   */
  static createMultiTenantDataset() {
    const company1Dataset = this.createCompanyDataset();
    const company2Dataset = this.createCompanyDataset();

    return {
      company1: company1Dataset,
      company2: company2Dataset,
    };
  }

  /**
   * Generate a batch of test records
   */
  static createBatch<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, () => factory());
  }
}

// Convenience functions for quick data generation
export const createTestCompany = TestDataFactory.createCompany;
export const createTestUser = TestDataFactory.createUser;
export const createTestBranch = TestDataFactory.createBranch;
export const createTestClient = TestDataFactory.createClient;
export const createTestStaff = TestDataFactory.createStaff;
export const createTestService = TestDataFactory.createService;
export const createTestAppointment = TestDataFactory.createAppointment;
export const createTestInvoice = TestDataFactory.createInvoice;
export const createTestPayment = TestDataFactory.createPayment;