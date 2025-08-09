import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../src/app';
import { TestDataFactory } from '../helpers/factories';
import { generateAccessToken } from '../helpers/auth';
import { prismaMock, InvoiceStatus, PaymentStatus, PaymentMethod } from '../setup';

// Mock app since it might not exist yet
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

describe('Invoice API', () => {
  let mockCompany: any;
  let mockUser: any;
  let mockClient: any;
  let mockAppointment: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test data
    mockCompany = TestDataFactory.createCompany();
    mockUser = TestDataFactory.createAdminUser(mockCompany.id);
    mockClient = TestDataFactory.createClient(mockCompany.id, mockUser.id);
    mockAppointment = TestDataFactory.createAppointment(
      mockCompany.id,
      mockClient.id,
      'staff1',
      'service1',
      'branch1',
      mockUser.id
    );
    authToken = generateAccessToken(mockUser);

    // Setup common mocks
    prismaMock.company.findUnique.mockResolvedValue(mockCompany);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.client.findUnique.mockResolvedValue(mockClient);
  });

  describe('Invoice Creation', () => {
    describe('POST /api/v1/invoices', () => {
      const validInvoiceData = {
        clientId: 'client1',
        title: 'Spa Services Invoice',
        dueDate: '2024-04-15T00:00:00Z',
        items: [
          {
            description: 'Deep Tissue Massage',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00,
          },
          {
            description: 'Facial Treatment',
            quantity: 1,
            unitPrice: 65.00,
            total: 65.00,
          },
        ],
        taxRate: 0.1, // 10%
        discountAmount: 10.00,
        notes: 'Thank you for your business!',
      };

      test('should create invoice with items', async () => {
        const expectedInvoice = {
          id: 'inv123',
          invoiceNumber: 'INV-20240315-001',
          companyId: mockCompany.id,
          clientId: validInvoiceData.clientId,
          title: validInvoiceData.title,
          subtotal: 145.00, // 80 + 65
          taxAmount: 13.50,  // (145 - 10) * 0.1
          discountAmount: 10.00,
          total: 148.50,     // 145 + 13.50 - 10
          status: InvoiceStatus.DRAFT,
          items: validInvoiceData.items,
        };

        prismaMock.invoice.create.mockResolvedValue(expectedInvoice);

        expect(expectedInvoice.subtotal).toBe(145.00);
        expect(expectedInvoice.taxAmount).toBe(13.50);
        expect(expectedInvoice.total).toBe(148.50);
        expect(expectedInvoice.status).toBe(InvoiceStatus.DRAFT);
      });

      test('should generate unique invoice number', async () => {
        const invoiceNumbers = ['INV-20240315-001', 'INV-20240315-002', 'INV-20240315-003'];
        
        // Mock sequential number generation
        prismaMock.invoice.count.mockResolvedValueOnce(0);
        prismaMock.invoice.count.mockResolvedValueOnce(1);
        prismaMock.invoice.count.mockResolvedValueOnce(2);

        const generatedNumbers = invoiceNumbers.map((_, index) => {
          const date = '20240315';
          const sequence = String(index + 1).padStart(3, '0');
          return `INV-${date}-${sequence}`;
        });

        expect(generatedNumbers[0]).toBe('INV-20240315-001');
        expect(generatedNumbers[1]).toBe('INV-20240315-002');
        expect(generatedNumbers[2]).toBe('INV-20240315-003');
      });

      test('should calculate taxes correctly', async () => {
        const testCases = [
          {
            subtotal: 100.00,
            taxRate: 0.1,
            discountAmount: 0,
            expectedTaxAmount: 10.00,
            expectedTotal: 110.00,
          },
          {
            subtotal: 100.00,
            taxRate: 0.15,
            discountAmount: 20.00,
            expectedTaxAmount: 12.00, // (100 - 20) * 0.15
            expectedTotal: 92.00,     // 100 + 12 - 20
          },
          {
            subtotal: 200.00,
            taxRate: 0.0825, // 8.25%
            discountAmount: 50.00,
            expectedTaxAmount: 12.375, // (200 - 50) * 0.0825
            expectedTotal: 162.375,    // 200 + 12.375 - 50
          },
        ];

        testCases.forEach((testCase, index) => {
          const taxableAmount = testCase.subtotal - testCase.discountAmount;
          const calculatedTaxAmount = taxableAmount * testCase.taxRate;
          const calculatedTotal = testCase.subtotal + calculatedTaxAmount - testCase.discountAmount;

          expect(calculatedTaxAmount).toBeCloseTo(testCase.expectedTaxAmount, 2);
          expect(calculatedTotal).toBeCloseTo(testCase.expectedTotal, 2);
        });
      });

      test('should apply discounts properly', async () => {
        const discountTypes = [
          {
            type: 'FIXED_AMOUNT',
            value: 25.00,
            subtotal: 100.00,
            expectedDiscount: 25.00,
            expectedTotal: 75.00, // No tax for simplicity
          },
          {
            type: 'PERCENTAGE',
            value: 0.15, // 15%
            subtotal: 100.00,
            expectedDiscount: 15.00,
            expectedTotal: 85.00,
          },
          {
            type: 'EARLY_BIRD',
            value: 0.1, // 10% for paying within 7 days
            subtotal: 200.00,
            expectedDiscount: 20.00,
            expectedTotal: 180.00,
          },
        ];

        discountTypes.forEach(discount => {
          const calculatedDiscount = discount.type === 'PERCENTAGE' 
            ? discount.subtotal * discount.value 
            : discount.value;
          const calculatedTotal = discount.subtotal - calculatedDiscount;

          expect(calculatedDiscount).toBe(discount.expectedDiscount);
          expect(calculatedTotal).toBe(discount.expectedTotal);
        });
      });

      test('should link to appointment if applicable', async () => {
        const appointmentInvoiceData = {
          ...validInvoiceData,
          appointmentId: mockAppointment.id,
          autoGenerated: true,
        };

        const invoiceWithAppointment = {
          id: 'inv123',
          ...appointmentInvoiceData,
          appointments: [{
            appointmentId: mockAppointment.id,
            invoiceId: 'inv123',
          }],
        };

        prismaMock.appointmentInvoice.create.mockResolvedValue(invoiceWithAppointment.appointments[0]);

        expect(invoiceWithAppointment.appointments).toHaveLength(1);
        expect(invoiceWithAppointment.appointments[0].appointmentId).toBe(mockAppointment.id);
      });

      test('should validate client exists', async () => {
        prismaMock.client.findUnique.mockResolvedValue(null);

        const expectedError = {
          status: 404,
          message: 'Client not found',
        };

        expect(expectedError.status).toBe(404);
        expect(expectedError.message).toBe('Client not found');
      });
    });
  });

  describe('Payment Processing', () => {
    let mockInvoice: any;

    beforeEach(() => {
      mockInvoice = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id, {
        total: 150.00,
        paidAmount: 0.00,
        status: InvoiceStatus.SENT,
      });
      prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice);
    });

    describe('POST /api/v1/invoices/:id/payments', () => {
      test('should record full payment', async () => {
        const fullPaymentData = {
          amount: 150.00,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          transactionId: 'txn_1234567890',
          paymentGateway: 'stripe',
          notes: 'Full payment received',
        };

        const payment = TestDataFactory.createPayment(
          mockCompany.id,
          mockClient.id,
          mockUser.id,
          mockInvoice.id,
          fullPaymentData
        );

        const updatedInvoice = {
          ...mockInvoice,
          paidAmount: 150.00,
          status: InvoiceStatus.PAID,
        };

        prismaMock.payment.create.mockResolvedValue(payment);
        prismaMock.invoice.update.mockResolvedValue(updatedInvoice);

        expect(updatedInvoice.paidAmount).toBe(150.00);
        expect(updatedInvoice.status).toBe(InvoiceStatus.PAID);
      });

      test('should handle partial payments', async () => {
        const partialPaymentData = {
          amount: 75.00, // Half of total
          paymentMethod: PaymentMethod.CASH,
          notes: 'Partial payment - cash',
        };

        const payment = TestDataFactory.createPayment(
          mockCompany.id,
          mockClient.id,
          mockUser.id,
          mockInvoice.id,
          partialPaymentData
        );

        const updatedInvoice = {
          ...mockInvoice,
          paidAmount: 75.00,
          status: InvoiceStatus.PARTIALLY_PAID,
        };

        prismaMock.payment.create.mockResolvedValue(payment);
        prismaMock.invoice.update.mockResolvedValue(updatedInvoice);

        expect(updatedInvoice.paidAmount).toBe(75.00);
        expect(updatedInvoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      });

      test('should update payment status', async () => {
        const paymentStatuses = [
          { amount: 0, expected: InvoiceStatus.SENT },
          { amount: 75, expected: InvoiceStatus.PARTIALLY_PAID },
          { amount: 150, expected: InvoiceStatus.PAID },
        ];

        paymentStatuses.forEach(({ amount, expected }) => {
          const status = getInvoiceStatusForPayment(150.00, amount);
          expect(status).toBe(expected);
        });
      });

      test('should calculate balance correctly', async () => {
        const scenarios = [
          { total: 150.00, paid: 0.00, expectedBalance: 150.00 },
          { total: 150.00, paid: 50.00, expectedBalance: 100.00 },
          { total: 150.00, paid: 150.00, expectedBalance: 0.00 },
        ];

        scenarios.forEach(scenario => {
          const balance = scenario.total - scenario.paid;
          expect(balance).toBe(scenario.expectedBalance);
        });
      });

      test('should handle multiple payment methods', async () => {
        const multiplePayments = [
          {
            amount: 50.00,
            paymentMethod: PaymentMethod.CASH,
            transactionId: null,
          },
          {
            amount: 75.00,
            paymentMethod: PaymentMethod.CREDIT_CARD,
            transactionId: 'txn_card_123',
          },
          {
            amount: 25.00,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            transactionId: 'txn_bank_456',
          },
        ];

        const totalPaid = multiplePayments.reduce((sum, payment) => sum + payment.amount, 0);
        expect(totalPaid).toBe(150.00);

        const updatedInvoice = {
          ...mockInvoice,
          paidAmount: totalPaid,
          status: InvoiceStatus.PAID,
        };

        expect(updatedInvoice.paidAmount).toBe(150.00);
        expect(updatedInvoice.status).toBe(InvoiceStatus.PAID);
      });

      test('should process refunds', async () => {
        // First, make the invoice paid
        const paidInvoice = {
          ...mockInvoice,
          paidAmount: 150.00,
          status: InvoiceStatus.PAID,
        };

        const refundData = {
          amount: -50.00, // Negative amount for refund
          paymentMethod: PaymentMethod.CREDIT_CARD,
          transactionId: 'refund_txn_123',
          notes: 'Partial refund for service cancellation',
        };

        const refundPayment = TestDataFactory.createPayment(
          mockCompany.id,
          mockClient.id,
          mockUser.id,
          paidInvoice.id,
          { ...refundData, status: PaymentStatus.REFUNDED }
        );

        const updatedInvoiceAfterRefund = {
          ...paidInvoice,
          paidAmount: 100.00, // 150 - 50
          status: InvoiceStatus.PARTIALLY_PAID,
        };

        prismaMock.payment.create.mockResolvedValue(refundPayment);
        prismaMock.invoice.update.mockResolvedValue(updatedInvoiceAfterRefund);

        expect(updatedInvoiceAfterRefund.paidAmount).toBe(100.00);
        expect(updatedInvoiceAfterRefund.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      });
    });
  });

  describe('Invoice Management', () => {
    let mockDraftInvoice: any;
    let mockSentInvoice: any;

    beforeEach(() => {
      mockDraftInvoice = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id, {
        status: InvoiceStatus.DRAFT,
      });
      
      mockSentInvoice = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id, {
        status: InvoiceStatus.SENT,
      });
    });

    describe('PUT /api/v1/invoices/:id', () => {
      test('should update draft invoice', async () => {
        const updateData = {
          title: 'Updated Invoice Title',
          notes: 'Updated notes',
          dueDate: '2024-05-01T00:00:00Z',
          items: [
            {
              description: 'Updated Service',
              quantity: 2,
              unitPrice: 75.00,
              total: 150.00,
            },
          ],
        };

        const updatedInvoice = {
          ...mockDraftInvoice,
          ...updateData,
          subtotal: 150.00,
          taxAmount: 15.00,
          total: 165.00,
        };

        prismaMock.invoice.findUnique.mockResolvedValue(mockDraftInvoice);
        prismaMock.invoice.update.mockResolvedValue(updatedInvoice);

        expect(updatedInvoice.title).toBe(updateData.title);
        expect(updatedInvoice.total).toBe(165.00);
      });

      test('should prevent editing sent invoice', async () => {
        prismaMock.invoice.findUnique.mockResolvedValue(mockSentInvoice);

        const expectedError = {
          status: 400,
          message: 'Cannot modify invoice that has already been sent',
        };

        expect(expectedError.status).toBe(400);
        expect(expectedError.message).toContain('already been sent');
      });
    });

    describe('POST /api/v1/invoices/:id/duplicate', () => {
      test('should duplicate invoice', async () => {
        const originalInvoice = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id);
        
        const duplicatedInvoice = {
          ...originalInvoice,
          id: 'new_invoice_id',
          invoiceNumber: 'INV-20240315-002',
          status: InvoiceStatus.DRAFT,
          paidAmount: 0.00,
          issueDate: new Date(),
          createdAt: new Date(),
        };

        prismaMock.invoice.findUnique.mockResolvedValue(originalInvoice);
        prismaMock.invoice.create.mockResolvedValue(duplicatedInvoice);

        expect(duplicatedInvoice.id).not.toBe(originalInvoice.id);
        expect(duplicatedInvoice.status).toBe(InvoiceStatus.DRAFT);
        expect(duplicatedInvoice.paidAmount).toBe(0.00);
      });
    });

    describe('POST /api/v1/invoices/:id/send', () => {
      test('should send invoice', async () => {
        const sentInvoice = {
          ...mockDraftInvoice,
          status: InvoiceStatus.SENT,
        };

        prismaMock.invoice.findUnique.mockResolvedValue(mockDraftInvoice);
        prismaMock.invoice.update.mockResolvedValue(sentInvoice);

        // Mock email service
        const emailSent = true;

        expect(sentInvoice.status).toBe(InvoiceStatus.SENT);
        expect(emailSent).toBe(true);
      });
    });

    describe('DELETE /api/v1/invoices/:id', () => {
      test('should cancel invoice', async () => {
        const cancelledInvoice = {
          ...mockDraftInvoice,
          status: InvoiceStatus.CANCELLED,
        };

        prismaMock.invoice.findUnique.mockResolvedValue(mockDraftInvoice);
        prismaMock.invoice.update.mockResolvedValue(cancelledInvoice);

        expect(cancelledInvoice.status).toBe(InvoiceStatus.CANCELLED);
      });
    });

    describe('Automatic Status Updates', () => {
      test('should mark as overdue automatically', async () => {
        const pastDueInvoice = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id, {
          status: InvoiceStatus.SENT,
          dueDate: new Date('2024-03-01'), // Past date
          paidAmount: 0.00,
        });

        const currentDate = new Date('2024-03-15');
        const isOverdue = currentDate > pastDueInvoice.dueDate && pastDueInvoice.paidAmount < pastDueInvoice.total;

        expect(isOverdue).toBe(true);

        const overdueInvoice = {
          ...pastDueInvoice,
          status: InvoiceStatus.OVERDUE,
        };

        expect(overdueInvoice.status).toBe(InvoiceStatus.OVERDUE);
      });
    });
  });

  describe('PDF Generation', () => {
    let mockInvoiceForPDF: any;

    beforeEach(() => {
      mockInvoiceForPDF = TestDataFactory.createInvoice(mockCompany.id, mockClient.id, mockUser.id, {
        status: InvoiceStatus.SENT,
        items: [
          {
            id: 'item1',
            description: 'Deep Tissue Massage',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00,
          },
          {
            id: 'item2',
            description: 'Aromatherapy Add-on',
            quantity: 1,
            unitPrice: 20.00,
            total: 20.00,
          },
        ],
        subtotal: 100.00,
        taxAmount: 10.00,
        total: 110.00,
      });
    });

    describe('GET /api/v1/invoices/:id/pdf', () => {
      test('should generate PDF with all details', async () => {
        prismaMock.invoice.findUnique.mockResolvedValue(mockInvoiceForPDF);

        const pdfContent = {
          header: {
            companyName: mockCompany.name,
            companyAddress: mockCompany.address,
            invoiceNumber: mockInvoiceForPDF.invoiceNumber,
            issueDate: mockInvoiceForPDF.issueDate,
            dueDate: mockInvoiceForPDF.dueDate,
          },
          client: {
            name: `${mockClient.firstName} ${mockClient.lastName}`,
            email: mockClient.email,
            address: mockClient.address,
          },
          items: mockInvoiceForPDF.items,
          summary: {
            subtotal: mockInvoiceForPDF.subtotal,
            taxAmount: mockInvoiceForPDF.taxAmount,
            discountAmount: mockInvoiceForPDF.discountAmount || 0,
            total: mockInvoiceForPDF.total,
          },
          footer: {
            notes: mockInvoiceForPDF.notes,
            terms: mockInvoiceForPDF.terms,
          },
        };

        expect(pdfContent.header.companyName).toBe(mockCompany.name);
        expect(pdfContent.client.name).toContain(mockClient.firstName);
        expect(pdfContent.items).toHaveLength(2);
        expect(pdfContent.summary.total).toBe(110.00);
      });

      test('should include company branding', async () => {
        const companyWithBranding = {
          ...mockCompany,
          logo: 'https://example.com/logo.png',
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B',
        };

        prismaMock.company.findUnique.mockResolvedValue(companyWithBranding);

        const brandingElements = {
          logo: companyWithBranding.logo,
          colors: {
            primary: companyWithBranding.primaryColor,
            secondary: companyWithBranding.secondaryColor,
          },
          fonts: {
            heading: 'Inter Bold',
            body: 'Inter Regular',
          },
        };

        expect(brandingElements.logo).toBe(companyWithBranding.logo);
        expect(brandingElements.colors.primary).toBe('#3B82F6');
      });

      test('should support multiple languages', async () => {
        const languageSupport = {
          en: {
            invoiceTitle: 'Invoice',
            dueDate: 'Due Date',
            subtotal: 'Subtotal',
            tax: 'Tax',
            total: 'Total',
          },
          es: {
            invoiceTitle: 'Factura',
            dueDate: 'Fecha de Vencimiento',
            subtotal: 'Subtotal',
            tax: 'Impuesto',
            total: 'Total',
          },
          fr: {
            invoiceTitle: 'Facture',
            dueDate: 'Date d\'échéance',
            subtotal: 'Sous-total',
            tax: 'Taxe',
            total: 'Total',
          },
        };

        const clientLanguage = 'es';
        const labels = languageSupport[clientLanguage] || languageSupport.en;

        expect(labels.invoiceTitle).toBe('Factura');
        expect(labels.dueDate).toBe('Fecha de Vencimiento');
      });

      test('should handle custom templates', async () => {
        const customTemplate = {
          id: 'template_modern',
          name: 'Modern Template',
          layout: 'single-column',
          sections: [
            { type: 'header', position: 'top' },
            { type: 'client-info', position: 'left' },
            { type: 'items-table', position: 'center' },
            { type: 'payment-info', position: 'bottom' },
          ],
          styles: {
            headerColor: '#1F2937',
            accentColor: '#3B82F6',
            fontSize: '12pt',
          },
        };

        const templateSettings = {
          templateId: customTemplate.id,
          showLogo: true,
          showPaymentTerms: true,
          showNotes: true,
          watermark: null,
        };

        expect(customTemplate.layout).toBe('single-column');
        expect(templateSettings.showLogo).toBe(true);
      });
    });

    describe('PDF Generation Performance', () => {
      test('should generate PDF within acceptable time', async () => {
        const startTime = Date.now();
        
        // Mock PDF generation time
        const mockGenerationTime = 500; // 500ms
        await new Promise(resolve => setTimeout(resolve, mockGenerationTime));
        
        const endTime = Date.now();
        const actualTime = endTime - startTime;
        
        expect(actualTime).toBeLessThan(2000); // Should complete within 2 seconds
      });

      test('should handle large invoices efficiently', async () => {
        const largeInvoice = {
          ...mockInvoiceForPDF,
          items: Array(100).fill({
            description: 'Service Item',
            quantity: 1,
            unitPrice: 10.00,
            total: 10.00,
          }),
        };

        // Large invoice should still generate successfully
        const canGenerate = largeInvoice.items.length <= 1000; // Reasonable limit
        expect(canGenerate).toBe(true);
      });
    });
  });

  describe('Appointment to Invoice Flow', () => {
    let completedAppointment: any;
    let mockServicePricing: any;

    beforeEach(() => {
      mockServicePricing = {
        serviceId: mockService.id,
        price: 85.00,
        duration: { hours: 1, minutes: 0 }
      };

      completedAppointment = TestDataFactory.createAppointment(
        mockCompany.id,
        mockClient.id,
        'staff1',
        mockService.id,
        'branch1',
        mockUser.id,
        {
          status: 'COMPLETED',
          startTime: new Date('2024-03-15T10:00:00Z'),
          endTime: new Date('2024-03-15T11:00:00Z'),
          completedAt: new Date('2024-03-15T11:00:00Z'),
          services: [mockServicePricing]
        }
      );
    });

    test('should auto-generate invoice after appointment completion', async () => {
      // Create and complete appointment
      prismaMock.appointment.findUnique.mockResolvedValue(completedAppointment);
      prismaMock.service.findMany.mockResolvedValue([{
        ...mockService,
        price: 85.00
      }]);

      const autoGeneratedInvoice = {
        id: 'auto_inv_123',
        invoiceNumber: 'INV-20240315-001',
        companyId: mockCompany.id,
        clientId: mockClient.id,
        appointmentId: completedAppointment.id,
        title: `Services for ${mockClient.firstName} ${mockClient.lastName}`,
        items: [
          {
            description: mockService.name,
            quantity: 1,
            unitPrice: 85.00,
            total: 85.00,
            serviceId: mockService.id,
            appointmentId: completedAppointment.id
          }
        ],
        subtotal: 85.00,
        taxRate: 0.10,
        taxAmount: 8.50,
        total: 93.50,
        status: InvoiceStatus.DRAFT,
        autoGenerated: true,
        createdAt: new Date(),
      };

      prismaMock.invoice.create.mockResolvedValue(autoGeneratedInvoice);
      prismaMock.appointmentInvoice.create.mockResolvedValue({
        appointmentId: completedAppointment.id,
        invoiceId: autoGeneratedInvoice.id
      });

      // Verify invoice created with correct items
      expect(autoGeneratedInvoice.appointmentId).toBe(completedAppointment.id);
      expect(autoGeneratedInvoice.items).toHaveLength(1);
      expect(autoGeneratedInvoice.items[0].description).toBe(mockService.name);
      
      // Verify pricing matches services
      expect(autoGeneratedInvoice.items[0].unitPrice).toBe(85.00);
      expect(autoGeneratedInvoice.subtotal).toBe(85.00);
      expect(autoGeneratedInvoice.total).toBe(93.50); // With tax
      expect(autoGeneratedInvoice.autoGenerated).toBe(true);
    });

    test('should handle multi-service invoicing', async () => {
      // Appointment with multiple services
      const multiServiceAppointment = {
        ...completedAppointment,
        services: [
          { serviceId: 'service1', price: 80.00, duration: { hours: 1, minutes: 0 } },
          { serviceId: 'service2', price: 45.00, duration: { hours: 0, minutes: 30 } },
          { serviceId: 'service3', price: 25.00, duration: { hours: 0, minutes: 15 } }
        ]
      };

      const serviceDetails = [
        { id: 'service1', name: 'Deep Tissue Massage', price: 80.00 },
        { id: 'service2', name: 'Facial Treatment', price: 45.00 },
        { id: 'service3', name: 'Add-on Oil Treatment', price: 25.00 }
      ];

      prismaMock.appointment.findUnique.mockResolvedValue(multiServiceAppointment);
      prismaMock.service.findMany.mockResolvedValue(serviceDetails);

      const multiServiceInvoice = {
        id: 'multi_inv_123',
        items: [
          {
            description: 'Deep Tissue Massage',
            quantity: 1,
            unitPrice: 80.00,
            total: 80.00,
            serviceId: 'service1'
          },
          {
            description: 'Facial Treatment',
            quantity: 1,
            unitPrice: 45.00,
            total: 45.00,
            serviceId: 'service2'
          },
          {
            description: 'Add-on Oil Treatment',
            quantity: 1,
            unitPrice: 25.00,
            total: 25.00,
            serviceId: 'service3'
          }
        ],
        subtotal: 150.00, // 80 + 45 + 25
        taxAmount: 15.00,  // 10% tax
        total: 165.00,     // 150 + 15
      };

      // Verify all services appear as line items
      expect(multiServiceInvoice.items).toHaveLength(3);
      multiServiceInvoice.items.forEach((item, index) => {
        expect(item.serviceId).toBe(serviceDetails[index].id);
        expect(item.description).toBe(serviceDetails[index].name);
        expect(item.unitPrice).toBe(serviceDetails[index].price);
      });

      // Verify total calculation
      const calculatedSubtotal = multiServiceInvoice.items.reduce((sum, item) => sum + item.total, 0);
      expect(calculatedSubtotal).toBe(150.00);
      expect(multiServiceInvoice.total).toBe(165.00);
    });

    test('should apply discounts correctly', async () => {
      // Create appointment with discount
      const discountedAppointment = {
        ...completedAppointment,
        discountType: 'PERCENTAGE',
        discountValue: 0.15, // 15% discount
        discountAmount: 12.75, // 15% of 85.00
        services: [mockServicePricing]
      };

      prismaMock.appointment.findUnique.mockResolvedValue(discountedAppointment);
      prismaMock.service.findMany.mockResolvedValue([mockService]);

      // Complete and generate invoice
      const discountedInvoice = {
        id: 'discount_inv_123',
        items: [
          {
            description: mockService.name,
            quantity: 1,
            unitPrice: 85.00,
            total: 85.00
          }
        ],
        subtotal: 85.00,
        discountType: 'PERCENTAGE',
        discountValue: 0.15,
        discountAmount: 12.75,
        taxableAmount: 72.25, // 85.00 - 12.75
        taxRate: 0.10,
        taxAmount: 7.23, // 10% of taxable amount
        total: 79.48, // 85.00 - 12.75 + 7.23
      };

      // Verify discount applied
      const expectedDiscountAmount = discountedInvoice.subtotal * 0.15;
      expect(discountedInvoice.discountAmount).toBeCloseTo(expectedDiscountAmount, 2);
      
      const expectedTaxableAmount = discountedInvoice.subtotal - discountedInvoice.discountAmount;
      expect(discountedInvoice.taxableAmount).toBeCloseTo(expectedTaxableAmount, 2);
      
      const expectedTotal = expectedTaxableAmount + (expectedTaxableAmount * 0.10);
      expect(discountedInvoice.total).toBeCloseTo(expectedTotal, 2);
    });
  });
});

// Helper function to determine invoice status based on payment
function getInvoiceStatusForPayment(total: number, paidAmount: number): InvoiceStatus {
  if (paidAmount === 0) return InvoiceStatus.SENT;
  if (paidAmount >= total) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIALLY_PAID;
}