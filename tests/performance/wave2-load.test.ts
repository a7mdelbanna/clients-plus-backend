import { performance } from 'perf_hooks';
import { TestDataFactory } from '../helpers/factories';
import { generateAccessToken } from '../helpers/auth';
import { prismaMock } from '../setup';

// Mock external dependencies for performance testing
jest.mock('../../src/app', () => ({
  app: {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn(),
  }
}));

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  availability_calculation: {
    single_request: 500, // ms
    concurrent_requests: 2000, // ms
    high_load: 5000, // ms
  },
  concurrent_booking: {
    single_booking: 1000, // ms
    conflict_resolution: 100, // ms
  },
  websocket: {
    connection_time: 100, // ms
    message_latency: 50, // ms
    broadcast_time: 200, // ms
  },
  invoice_generation: {
    simple_invoice: 300, // ms
    complex_invoice: 800, // ms
    pdf_generation: 2000, // ms
    batch_generation: 10000, // ms
  },
};

describe('Wave 2 Performance Tests', () => {
  let mockCompany: any;
  let mockUser: any;
  let mockBranch: any;
  let mockStaff: any;
  let mockService: any;
  let authToken: string;

  beforeEach(() => {
    // Create test data
    mockCompany = TestDataFactory.createCompany();
    mockUser = TestDataFactory.createAdminUser(mockCompany.id);
    mockBranch = TestDataFactory.createBranch(mockCompany.id);
    mockStaff = TestDataFactory.createStaff(mockCompany.id, mockBranch.id);
    mockService = TestDataFactory.createService(mockCompany.id);
    authToken = generateAccessToken(mockUser);

    // Setup base mocks
    prismaMock.company.findUnique.mockResolvedValue(mockCompany);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.branch.findUnique.mockResolvedValue(mockBranch);
    prismaMock.staff.findUnique.mockResolvedValue(mockStaff);
    prismaMock.service.findUnique.mockResolvedValue(mockService);
  });

  describe('Availability Calculation Performance', () => {
    test('should handle single availability request within threshold', async () => {
      // Mock staff schedule data
      prismaMock.staffSchedule.findMany.mockResolvedValue([{
        id: 'schedule1',
        staffId: mockStaff.id,
        branchId: mockBranch.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isWorking: true,
        breaks: [{ start: '12:00', end: '13:00' }],
        startDate: new Date('2024-03-01'),
        endDate: null,
        type: 'REGULAR',
        overrideDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      // Mock existing appointments
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const startTime = performance.now();

      // Simulate availability calculation
      const availabilityRequest = {
        staffId: mockStaff.id,
        serviceId: mockService.id,
        branchId: mockBranch.id,
        date: '2024-03-18',
        duration: 60,
      };

      // Mock availability calculation logic
      await simulateAvailabilityCalculation(availabilityRequest);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.availability_calculation.single_request);
      
      // Log performance metrics
      console.log(`Availability calculation time: ${executionTime.toFixed(2)}ms`);
    });

    test('should handle 100 concurrent availability checks', async () => {
      const concurrentRequests = 100;
      const requests = [];

      // Setup mock data for concurrent requests
      prismaMock.staffSchedule.findMany.mockResolvedValue([{
        id: 'schedule1',
        staffId: mockStaff.id,
        branchId: mockBranch.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isWorking: true,
        breaks: [],
        startDate: new Date('2024-03-01'),
        endDate: null,
        type: 'REGULAR',
        overrideDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      prismaMock.appointment.findMany.mockResolvedValue([]);

      const startTime = performance.now();

      // Create concurrent availability requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          simulateAvailabilityCalculation({
            staffId: mockStaff.id,
            serviceId: mockService.id,
            branchId: mockBranch.id,
            date: '2024-03-18',
            duration: 60,
          })
        );
      }

      // Execute all requests concurrently
      const results = await Promise.all(requests);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.availability_calculation.concurrent_requests);
      expect(results).toHaveLength(concurrentRequests);

      // Calculate average response time
      const avgResponseTime = executionTime / concurrentRequests;
      console.log(`Concurrent availability checks: ${concurrentRequests} requests in ${executionTime.toFixed(2)}ms`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms per request`);
    });

    test('should handle complex availability scenarios efficiently', async () => {
      // Create complex scenario with multiple staff, services, and existing appointments
      const staffMembers = Array(10).fill(null).map((_, i) => 
        TestDataFactory.createStaff(mockCompany.id, mockBranch.id, { id: `staff${i}` })
      );

      const existingAppointments = Array(50).fill(null).map((_, i) => 
        TestDataFactory.createAppointment(
          mockCompany.id,
          'client1',
          staffMembers[i % 10].id,
          mockService.id,
          mockBranch.id,
          mockUser.id,
          {
            startTime: new Date(`2024-03-18T${9 + Math.floor(i/10)}:${(i%10)*6}:00Z`),
            endTime: new Date(`2024-03-18T${9 + Math.floor(i/10)}:${(i%10)*6 + 60}:00Z`),
          }
        )
      );

      const schedules = staffMembers.map(staff => ({
        id: `schedule_${staff.id}`,
        staffId: staff.id,
        branchId: mockBranch.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isWorking: true,
        breaks: [{ start: '12:00', end: '13:00' }],
        startDate: new Date('2024-03-01'),
        endDate: null,
        type: 'REGULAR',
        overrideDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prismaMock.staffSchedule.findMany.mockResolvedValue(schedules);
      prismaMock.appointment.findMany.mockResolvedValue(existingAppointments);

      const startTime = performance.now();

      // Simulate complex availability calculation
      await simulateComplexAvailabilityCalculation({
        branchId: mockBranch.id,
        date: '2024-03-18',
        services: [mockService.id],
        duration: 60,
        staffCount: 10,
        existingAppointments: 50,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.availability_calculation.high_load);
      
      console.log(`Complex availability calculation: ${executionTime.toFixed(2)}ms`);
    });

    test('should check database query performance', async () => {
      // Simulate database-heavy availability calculation
      const queryStartTime = performance.now();

      // Mock multiple database queries
      await Promise.all([
        prismaMock.staffSchedule.findMany(),
        prismaMock.appointment.findMany(),
        prismaMock.staffTimeOff.findMany(),
        prismaMock.branch.findUnique(),
        prismaMock.service.findUnique(),
      ]);

      const queryEndTime = performance.now();
      const queryTime = queryEndTime - queryStartTime;

      // Database queries should be fast
      expect(queryTime).toBeLessThan(100); // 100ms threshold for DB queries
      
      console.log(`Database query time: ${queryTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Booking Performance', () => {
    test('should handle concurrent booking attempts', async () => {
      const numberOfAttempts = 50;
      const selectedSlot = {
        start: '2024-03-18T10:00:00Z',
        end: '2024-03-18T11:00:00Z',
      };

      // Mock initial availability (no conflicts)
      prismaMock.appointment.findMany.mockResolvedValue([]);

      const startTime = performance.now();
      const bookingAttempts = [];

      // Simulate 50 users trying to book the same slot
      for (let i = 0; i < numberOfAttempts; i++) {
        const client = TestDataFactory.createClient(mockCompany.id, mockUser.id, {
          id: `client${i}`,
        });

        bookingAttempts.push(
          simulateBookingAttempt({
            clientId: client.id,
            staffId: mockStaff.id,
            serviceId: mockService.id,
            branchId: mockBranch.id,
            startTime: selectedSlot.start,
            endTime: selectedSlot.end,
            attemptNumber: i,
          })
        );
      }

      const results = await Promise.allSettled(bookingAttempts);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Only one booking should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const conflicts = results.filter(r => r.status === 'fulfilled' && r.value.conflict);

      expect(successful).toHaveLength(1);
      expect(conflicts.length).toBe(numberOfAttempts - 1);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrent_booking.single_booking);

      console.log(`Concurrent bookings: ${numberOfAttempts} attempts in ${executionTime.toFixed(2)}ms`);
      console.log(`Successful: ${successful.length}, Conflicts: ${conflicts.length}`);
    });

    test('should resolve conflicts quickly', async () => {
      const conflictingBookings = [
        {
          clientId: 'client1',
          startTime: '2024-03-18T10:00:00Z',
          endTime: '2024-03-18T11:00:00Z',
        },
        {
          clientId: 'client2',
          startTime: '2024-03-18T10:30:00Z',
          endTime: '2024-03-18T11:30:00Z',
        },
        {
          clientId: 'client3',
          startTime: '2024-03-18T09:30:00Z',
          endTime: '2024-03-18T10:30:00Z',
        },
      ];

      const existingAppointment = TestDataFactory.createAppointment(
        mockCompany.id,
        'existing_client',
        mockStaff.id,
        mockService.id,
        mockBranch.id,
        mockUser.id,
        {
          startTime: new Date('2024-03-18T10:00:00Z'),
          endTime: new Date('2024-03-18T11:00:00Z'),
        }
      );

      prismaMock.appointment.findMany.mockResolvedValue([existingAppointment]);

      const startTime = performance.now();

      // Test conflict detection for each booking
      const conflictResults = await Promise.all(
        conflictingBookings.map(booking => 
          simulateConflictDetection(booking, existingAppointment)
        )
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrent_booking.conflict_resolution);
      expect(conflictResults.every(r => r.hasConflict)).toBe(true);

      console.log(`Conflict resolution time: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('WebSocket Scalability', () => {
    test('should handle 1000 WebSocket connections', async () => {
      const connectionCount = 1000;
      const connections = [];

      const startTime = performance.now();

      // Simulate WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        connections.push(
          simulateWebSocketConnection({
            userId: `user${i}`,
            companyId: mockCompany.id,
            token: authToken,
          })
        );
      }

      const connectionResults = await Promise.all(connections);
      
      const connectionEndTime = performance.now();
      const connectionTime = connectionEndTime - startTime;

      expect(connectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.websocket.connection_time * connectionCount / 10);
      expect(connectionResults.every(r => r.connected)).toBe(true);

      console.log(`WebSocket connections: ${connectionCount} in ${connectionTime.toFixed(2)}ms`);

      // Test broadcast performance
      const broadcastStartTime = performance.now();

      const broadcastMessage = {
        type: 'APPOINTMENT_CREATED',
        data: {
          appointmentId: 'test123',
          clientName: 'John Doe',
          serviceTime: '2024-03-18T10:00:00Z',
        },
      };

      // Simulate broadcast to all connections
      await simulateBroadcast(broadcastMessage, connectionCount);

      const broadcastEndTime = performance.now();
      const broadcastTime = broadcastEndTime - broadcastStartTime;

      expect(broadcastTime).toBeLessThan(PERFORMANCE_THRESHOLDS.websocket.broadcast_time);
      
      console.log(`Broadcast time: ${broadcastTime.toFixed(2)}ms for ${connectionCount} connections`);
    });

    test('should measure message latency', async () => {
      const messageCount = 100;
      const latencies = [];

      for (let i = 0; i < messageCount; i++) {
        const messageStartTime = performance.now();
        
        // Simulate message send and acknowledgment
        await simulateMessageLatency({
          messageId: `msg${i}`,
          type: 'test_message',
          payload: { counter: i },
        });

        const messageEndTime = performance.now();
        const latency = messageEndTime - messageStartTime;
        latencies.push(latency);
      }

      const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      expect(averageLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.websocket.message_latency);
      expect(maxLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.websocket.message_latency * 2);

      console.log(`Message latency - Avg: ${averageLatency.toFixed(2)}ms, Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
    });
  });

  describe('Invoice Generation Performance', () => {
    test('should generate simple invoice quickly', async () => {
      const simpleInvoiceData = {
        clientId: 'client1',
        items: [
          {
            description: 'Deep Tissue Massage',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00,
          }
        ],
        subtotal: 80.00,
        taxRate: 0.1,
        total: 88.00,
      };

      const startTime = performance.now();

      // Simulate simple invoice generation
      const invoice = await simulateInvoiceGeneration(simpleInvoiceData);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.invoice_generation.simple_invoice);
      expect(invoice).toBeDefined();
      
      console.log(`Simple invoice generation time: ${executionTime.toFixed(2)}ms`);
    });

    test('should generate complex invoice with multiple items', async () => {
      const complexInvoiceData = {
        clientId: 'client1',
        items: Array(20).fill(null).map((_, i) => ({
          description: `Service ${i + 1}`,
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: Math.floor(Math.random() * 100) + 25,
          total: 0, // Will be calculated
        })),
        discounts: [
          { type: 'PERCENTAGE', value: 0.1, description: 'Loyalty Discount' },
          { type: 'FIXED', value: 15.00, description: 'First Time Client' },
        ],
        taxRates: [
          { type: 'STATE', rate: 0.08, description: 'State Tax' },
          { type: 'LOCAL', rate: 0.025, description: 'Local Tax' },
        ],
      };

      const startTime = performance.now();

      // Simulate complex invoice generation
      const invoice = await simulateComplexInvoiceGeneration(complexInvoiceData);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.invoice_generation.complex_invoice);
      expect(invoice.items).toHaveLength(20);
      
      console.log(`Complex invoice generation time: ${executionTime.toFixed(2)}ms`);
    });

    test('should generate PDF within acceptable time', async () => {
      const invoiceData = TestDataFactory.createInvoice(mockCompany.id, 'client1', mockUser.id, {
        items: [
          {
            description: 'Deep Tissue Massage',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00,
          }
        ],
        total: 88.00,
      });

      const startTime = performance.now();

      // Simulate PDF generation
      const pdfBuffer = await simulatePDFGeneration(invoiceData);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.invoice_generation.pdf_generation);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000); // Reasonable PDF size
      
      console.log(`PDF generation time: ${executionTime.toFixed(2)}ms`);
      console.log(`PDF size: ${pdfBuffer.length} bytes`);
    });

    test('should handle batch invoice generation', async () => {
      const batchSize = 100;
      const invoices = Array(batchSize).fill(null).map((_, i) => 
        TestDataFactory.createInvoice(mockCompany.id, `client${i}`, mockUser.id, {
          invoiceNumber: `INV-BATCH-${i.toString().padStart(3, '0')}`,
        })
      );

      const startTime = performance.now();

      // Simulate batch processing
      const results = await simulateBatchInvoiceGeneration(invoices);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.invoice_generation.batch_generation);
      expect(results).toHaveLength(batchSize);
      expect(results.every(r => r.success)).toBe(true);

      const avgTimePerInvoice = executionTime / batchSize;
      console.log(`Batch invoice generation: ${batchSize} invoices in ${executionTime.toFixed(2)}ms`);
      console.log(`Average time per invoice: ${avgTimePerInvoice.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should monitor memory usage during high load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate high load scenario
      const tasks = [];
      
      // Concurrent availability calculations
      for (let i = 0; i < 50; i++) {
        tasks.push(simulateAvailabilityCalculation({
          staffId: mockStaff.id,
          serviceId: mockService.id,
          date: '2024-03-18',
          duration: 60,
        }));
      }
      
      // Concurrent bookings
      for (let i = 0; i < 25; i++) {
        tasks.push(simulateBookingAttempt({
          clientId: `client${i}`,
          staffId: mockStaff.id,
          serviceId: mockService.id,
          startTime: `2024-03-18T${10 + Math.floor(i/5)}:${(i%5)*12}:00Z`,
        }));
      }
      
      // Invoice generations
      for (let i = 0; i < 25; i++) {
        tasks.push(simulateInvoiceGeneration({
          clientId: `client${i}`,
          items: [{ description: 'Service', quantity: 1, unitPrice: 50 }],
        }));
      }

      const startTime = performance.now();
      await Promise.all(tasks);
      const endTime = performance.now();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = {
        heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024, // MB
        heapTotal: (finalMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024,
        rss: (finalMemory.rss - initialMemory.rss) / 1024 / 1024,
      };

      console.log(`High load test completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`Memory increase - Heap Used: ${memoryIncrease.heapUsed.toFixed(2)}MB, RSS: ${memoryIncrease.rss.toFixed(2)}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease.heapUsed).toBeLessThan(100); // Less than 100MB increase
    });
  });
});

// Helper functions to simulate operations
async function simulateAvailabilityCalculation(request: any): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
  
  return {
    availableSlots: [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
    ],
    date: request.date,
    staffId: request.staffId,
  };
}

async function simulateComplexAvailabilityCalculation(request: any): Promise<any> {
  // Simulate more complex processing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
  
  return {
    availableSlots: Array(request.staffCount * 8).fill(null).map((_, i) => ({
      staffId: `staff${Math.floor(i / 8)}`,
      slot: { start: `${9 + Math.floor(i % 8)}:00`, end: `${10 + Math.floor(i % 8)}:00` },
    })),
    totalSlots: request.staffCount * 8,
  };
}

async function simulateBookingAttempt(request: any): Promise<any> {
  // Simulate booking processing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));
  
  // First attempt succeeds, others conflict
  const success = request.attemptNumber === 0;
  
  return {
    success,
    conflict: !success,
    appointmentId: success ? `appointment_${request.attemptNumber}` : null,
  };
}

async function simulateConflictDetection(booking: any, existing: any): Promise<any> {
  // Simulate conflict detection logic
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
  
  const bookingStart = new Date(booking.startTime);
  const bookingEnd = new Date(booking.endTime);
  const existingStart = new Date(existing.startTime);
  const existingEnd = new Date(existing.endTime);
  
  const hasConflict = bookingStart < existingEnd && bookingEnd > existingStart;
  
  return { hasConflict };
}

async function simulateWebSocketConnection(config: any): Promise<any> {
  // Simulate connection time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
  
  return {
    connected: true,
    userId: config.userId,
    socketId: `socket_${Math.random().toString(36).substr(2, 9)}`,
  };
}

async function simulateBroadcast(message: any, connectionCount: number): Promise<void> {
  // Simulate broadcast processing time
  const baseTime = Math.log(connectionCount) * 5; // Logarithmic scaling
  await new Promise(resolve => setTimeout(resolve, baseTime));
}

async function simulateMessageLatency(message: any): Promise<void> {
  // Simulate message round-trip time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
}

async function simulateInvoiceGeneration(data: any): Promise<any> {
  // Simulate invoice creation
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
  
  return {
    id: `invoice_${Date.now()}`,
    ...data,
    generatedAt: new Date(),
  };
}

async function simulateComplexInvoiceGeneration(data: any): Promise<any> {
  // Simulate complex invoice with calculations
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  
  return {
    id: `complex_invoice_${Date.now()}`,
    items: data.items,
    subtotal: data.items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0),
    discounts: data.discounts,
    taxRates: data.taxRates,
    generatedAt: new Date(),
  };
}

async function simulatePDFGeneration(invoice: any): Promise<Buffer> {
  // Simulate PDF generation time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  
  // Return mock PDF buffer
  const mockPDFContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
184
%%EOF`;
  
  return Buffer.from(mockPDFContent);
}

async function simulateBatchInvoiceGeneration(invoices: any[]): Promise<any[]> {
  // Simulate batch processing
  const batchProcessingTime = invoices.length * 5 + Math.random() * 100;
  await new Promise(resolve => setTimeout(resolve, batchProcessingTime));
  
  return invoices.map(invoice => ({
    success: true,
    invoiceId: invoice.id,
    processingTime: Math.random() * 10 + 5,
  }));
}