import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { TestDataFactory } from '../helpers/factories';
import { generateAccessToken } from '../helpers/auth';
import { prismaMock } from '../setup';

describe('WebSocket Real-time Updates', () => {
  let ioServer: Server;
  let httpServer: any;
  let clientSocket1: any;
  let clientSocket2: any;
  let clientSocket3: any;
  let mockCompany: any;
  let mockUser: any;
  let mockBranch: any;
  let authToken: string;

  beforeAll((done) => {
    // Create test data
    mockCompany = TestDataFactory.createCompany();
    mockUser = TestDataFactory.createAdminUser(mockCompany.id);
    mockBranch = TestDataFactory.createBranch(mockCompany.id);
    authToken = generateAccessToken(mockUser);

    // Setup HTTP server and Socket.IO
    httpServer = createServer();
    ioServer = new Server(httpServer);

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      // Create client connections
      clientSocket1 = Client(`http://localhost:${port}`, {
        auth: { token: authToken },
        forceNew: true,
      });
      
      clientSocket2 = Client(`http://localhost:${port}`, {
        auth: { token: authToken },
        forceNew: true,
      });

      clientSocket3 = Client(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        forceNew: true,
      });

      // Wait for all connections
      let connectedClients = 0;
      const checkConnections = () => {
        connectedClients++;
        if (connectedClients === 2) { // Only valid clients connect
          done();
        }
      };

      clientSocket1.on('connect', checkConnections);
      clientSocket2.on('connect', checkConnections);
      
      // Invalid client should not connect
      clientSocket3.on('connect_error', () => {
        // Expected behavior for invalid token
      });
    });
  });

  afterAll((done) => {
    ioServer.close();
    httpServer.close(() => {
      done();
    });
  });

  beforeEach(() => {
    // Setup common mocks
    prismaMock.company.findUnique.mockResolvedValue(mockCompany);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.branch.findUnique.mockResolvedValue(mockBranch);
  });

  describe('Connection Management', () => {
    test('should connect with valid token', (done) => {
      const validToken = generateAccessToken(mockUser);
      const validClient = Client((httpServer.address() as any).port, {
        auth: { token: validToken },
        forceNew: true,
      });

      validClient.on('connect', () => {
        expect(validClient.connected).toBe(true);
        validClient.close();
        done();
      });

      validClient.on('connect_error', (error) => {
        done(new Error(`Should not have connection error: ${error.message}`));
      });
    });

    test('should reject invalid token', (done) => {
      const invalidClient = Client((httpServer.address() as any).port, {
        auth: { token: 'invalid-token-here' },
        forceNew: true,
      });

      invalidClient.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('authentication failed');
        invalidClient.close();
        done();
      });
    });

    test('should handle reconnection', (done) => {
      let reconnectCount = 0;
      const reconnectClient = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 100,
        reconnectionAttempts: 3,
      });

      reconnectClient.on('connect', () => {
        if (reconnectCount === 0) {
          reconnectCount++;
          // Simulate disconnection
          reconnectClient.disconnect();
        }
      });

      reconnectClient.on('reconnect', () => {
        expect(reconnectCount).toBe(1);
        expect(reconnectClient.connected).toBe(true);
        reconnectClient.close();
        done();
      });

      reconnectClient.on('connect_error', (error) => {
        done(new Error(`Reconnection failed: ${error.message}`));
      });
    });

    test('should clean up on disconnect', (done) => {
      const cleanupClient = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
      });

      cleanupClient.on('connect', () => {
        const socketId = cleanupClient.id;
        expect(socketId).toBeDefined();
        
        cleanupClient.on('disconnect', () => {
          // Verify cleanup occurred
          setTimeout(() => {
            // Check that socket is no longer in active connections
            const activeConnections = ioServer.sockets.sockets;
            expect(activeConnections.has(socketId)).toBe(false);
            done();
          }, 100);
        });

        cleanupClient.close();
      });
    });
  });

  describe('Room Management', () => {
    test('should join company room', (done) => {
      const testSocket = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
      });

      testSocket.on('connect', () => {
        // Emit join company room event
        testSocket.emit('join_company_room', { companyId: mockCompany.id });
        
        testSocket.on('room_joined', (data) => {
          expect(data.room).toBe(`company_${mockCompany.id}`);
          expect(data.success).toBe(true);
          testSocket.close();
          done();
        });
      });
    });

    test('should join branch room', (done) => {
      const testSocket = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
      });

      testSocket.on('connect', () => {
        testSocket.emit('join_branch_room', { 
          companyId: mockCompany.id,
          branchId: mockBranch.id 
        });
        
        testSocket.on('room_joined', (data) => {
          expect(data.room).toBe(`branch_${mockBranch.id}`);
          expect(data.success).toBe(true);
          testSocket.close();
          done();
        });
      });
    });

    test('should leave rooms on disconnect', (done) => {
      const testSocket = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
      });

      testSocket.on('connect', () => {
        const socketId = testSocket.id;
        
        // Join multiple rooms
        testSocket.emit('join_company_room', { companyId: mockCompany.id });
        testSocket.emit('join_branch_room', { 
          companyId: mockCompany.id,
          branchId: mockBranch.id 
        });

        setTimeout(() => {
          testSocket.on('disconnect', () => {
            setTimeout(() => {
              // Verify socket left all rooms
              const socket = ioServer.sockets.sockets.get(socketId);
              expect(socket).toBeUndefined();
              done();
            }, 100);
          });

          testSocket.close();
        }, 200);
      });
    });

    test('should isolate company broadcasts', (done) => {
      const company1Token = generateAccessToken(mockUser);
      const company2 = TestDataFactory.createCompany();
      const company2User = TestDataFactory.createAdminUser(company2.id);
      const company2Token = generateAccessToken(company2User);

      const socket1 = Client((httpServer.address() as any).port, {
        auth: { token: company1Token },
        forceNew: true,
      });

      const socket2 = Client((httpServer.address() as any).port, {
        auth: { token: company2Token },
        forceNew: true,
      });

      let connectionsReady = 0;
      let messageReceived = false;

      const checkReady = () => {
        connectionsReady++;
        if (connectionsReady === 2) {
          // Join different company rooms
          socket1.emit('join_company_room', { companyId: mockCompany.id });
          socket2.emit('join_company_room', { companyId: company2.id });

          setTimeout(() => {
            // Socket2 should not receive company1 messages
            socket2.on('appointment_created', () => {
              messageReceived = true;
            });

            // Broadcast to company1 room
            ioServer.to(`company_${mockCompany.id}`).emit('appointment_created', {
              appointment: { id: 'test123' },
            });

            setTimeout(() => {
              expect(messageReceived).toBe(false);
              socket1.close();
              socket2.close();
              done();
            }, 300);
          }, 200);
        }
      };

      socket1.on('connect', checkReady);
      socket2.on('connect', checkReady);
    });
  });

  describe('Appointment Events', () => {
    let testAppointment: any;

    beforeEach(() => {
      testAppointment = TestDataFactory.createAppointment(
        mockCompany.id,
        'client1',
        'staff1',
        'service1',
        mockBranch.id,
        mockUser.id
      );
    });

    test('should broadcast appointment creation', (done) => {
      clientSocket1.emit('join_company_room', { companyId: mockCompany.id });
      
      clientSocket1.on('appointment_created', (data) => {
        expect(data.appointment.id).toBe(testAppointment.id);
        expect(data.appointment.companyId).toBe(mockCompany.id);
        expect(data.type).toBe('APPOINTMENT_CREATED');
        done();
      });

      // Simulate appointment creation broadcast
      setTimeout(() => {
        ioServer.to(`company_${mockCompany.id}`).emit('appointment_created', {
          type: 'APPOINTMENT_CREATED',
          appointment: testAppointment,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should broadcast appointment updates', (done) => {
      const updatedAppointment = {
        ...testAppointment,
        startTime: new Date('2024-03-16T10:00:00Z'),
        endTime: new Date('2024-03-16T11:00:00Z'),
      };

      clientSocket1.emit('join_company_room', { companyId: mockCompany.id });
      
      clientSocket1.on('appointment_updated', (data) => {
        expect(data.appointment.id).toBe(testAppointment.id);
        expect(data.changes.startTime).toBe(updatedAppointment.startTime.toISOString());
        expect(data.type).toBe('APPOINTMENT_UPDATED');
        done();
      });

      setTimeout(() => {
        ioServer.to(`company_${mockCompany.id}`).emit('appointment_updated', {
          type: 'APPOINTMENT_UPDATED',
          appointment: updatedAppointment,
          changes: {
            startTime: updatedAppointment.startTime.toISOString(),
            endTime: updatedAppointment.endTime.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should broadcast cancellations', (done) => {
      const cancelledAppointment = {
        ...testAppointment,
        status: 'CANCELLED',
        cancellationReason: 'Client illness',
        cancelledAt: new Date(),
      };

      clientSocket1.emit('join_company_room', { companyId: mockCompany.id });
      
      clientSocket1.on('appointment_cancelled', (data) => {
        expect(data.appointment.status).toBe('CANCELLED');
        expect(data.appointment.cancellationReason).toBe('Client illness');
        expect(data.type).toBe('APPOINTMENT_CANCELLED');
        done();
      });

      setTimeout(() => {
        ioServer.to(`company_${mockCompany.id}`).emit('appointment_cancelled', {
          type: 'APPOINTMENT_CANCELLED',
          appointment: cancelledAppointment,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should update availability in real-time', (done) => {
      const availabilityUpdate = {
        staffId: 'staff1',
        date: '2024-03-15',
        availableSlots: [
          { start: '09:00', end: '10:00' },
          { start: '11:00', end: '12:00' },
          { start: '14:00', end: '15:00' },
        ],
        unavailableSlots: [
          { start: '10:00', end: '11:00', reason: 'booked' },
        ],
      };

      clientSocket1.emit('join_branch_room', { 
        companyId: mockCompany.id,
        branchId: mockBranch.id 
      });
      
      clientSocket1.on('availability_updated', (data) => {
        expect(data.staffId).toBe('staff1');
        expect(data.availableSlots).toHaveLength(3);
        expect(data.unavailableSlots).toHaveLength(1);
        expect(data.type).toBe('AVAILABILITY_UPDATED');
        done();
      });

      setTimeout(() => {
        ioServer.to(`branch_${mockBranch.id}`).emit('availability_updated', {
          type: 'AVAILABILITY_UPDATED',
          ...availabilityUpdate,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should notify affected staff', (done) => {
      const staffNotification = {
        staffId: 'staff1',
        type: 'NEW_APPOINTMENT',
        appointment: testAppointment,
        message: 'New appointment scheduled for tomorrow',
      };

      clientSocket1.emit('join_staff_room', { staffId: 'staff1' });
      
      clientSocket1.on('staff_notification', (data) => {
        expect(data.staffId).toBe('staff1');
        expect(data.type).toBe('NEW_APPOINTMENT');
        expect(data.appointment.id).toBe(testAppointment.id);
        done();
      });

      setTimeout(() => {
        ioServer.to(`staff_staff1`).emit('staff_notification', {
          ...staffNotification,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });
  });

  describe('Client Events', () => {
    let testClient: any;

    beforeEach(() => {
      testClient = TestDataFactory.createClient(mockCompany.id, mockUser.id);
    });

    test('should broadcast client updates', (done) => {
      const updatedClient = {
        ...testClient,
        phone: '+1-555-0199',
        email: 'newemail@example.com',
      };

      clientSocket1.emit('join_company_room', { companyId: mockCompany.id });
      
      clientSocket1.on('client_updated', (data) => {
        expect(data.client.id).toBe(testClient.id);
        expect(data.changes.phone).toBe('+1-555-0199');
        expect(data.type).toBe('CLIENT_UPDATED');
        done();
      });

      setTimeout(() => {
        ioServer.to(`company_${mockCompany.id}`).emit('client_updated', {
          type: 'CLIENT_UPDATED',
          client: updatedClient,
          changes: {
            phone: updatedClient.phone,
            email: updatedClient.email,
          },
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should handle client check-in', (done) => {
      const checkInData = {
        clientId: testClient.id,
        appointmentId: 'appt123',
        checkedInAt: new Date(),
        status: 'CHECKED_IN',
      };

      clientSocket1.emit('join_branch_room', { 
        companyId: mockCompany.id,
        branchId: mockBranch.id 
      });
      
      clientSocket1.on('client_checked_in', (data) => {
        expect(data.clientId).toBe(testClient.id);
        expect(data.status).toBe('CHECKED_IN');
        expect(data.type).toBe('CLIENT_CHECKED_IN');
        done();
      });

      setTimeout(() => {
        ioServer.to(`branch_${mockBranch.id}`).emit('client_checked_in', {
          type: 'CLIENT_CHECKED_IN',
          ...checkInData,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });

    test('should update waiting list', (done) => {
      const waitingListUpdate = {
        branchId: mockBranch.id,
        waitingList: [
          {
            clientId: testClient.id,
            clientName: `${testClient.firstName} ${testClient.lastName}`,
            serviceRequested: 'Deep Tissue Massage',
            waitingSince: new Date(),
            estimatedWait: 30, // minutes
          },
          {
            clientId: 'client2',
            clientName: 'Jane Doe',
            serviceRequested: 'Facial Treatment',
            waitingSince: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
            estimatedWait: 15,
          },
        ],
      };

      clientSocket1.emit('join_branch_room', { 
        companyId: mockCompany.id,
        branchId: mockBranch.id 
      });
      
      clientSocket1.on('waiting_list_updated', (data) => {
        expect(data.waitingList).toHaveLength(2);
        expect(data.waitingList[0].clientId).toBe(testClient.id);
        expect(data.type).toBe('WAITING_LIST_UPDATED');
        done();
      });

      setTimeout(() => {
        ioServer.to(`branch_${mockBranch.id}`).emit('waiting_list_updated', {
          type: 'WAITING_LIST_UPDATED',
          ...waitingListUpdate,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });
  });

  describe('Notification Events', () => {
    test('should send targeted notifications', (done) => {
      const targetedNotification = {
        userId: mockUser.id,
        type: 'INVOICE_OVERDUE',
        title: 'Overdue Invoice Alert',
        message: 'Invoice #INV-001 is now overdue',
        data: {
          invoiceId: 'inv123',
          clientName: 'John Doe',
          amount: 150.00,
        },
        priority: 'HIGH',
      };

      clientSocket1.emit('join_user_room', { userId: mockUser.id });
      
      clientSocket1.on('notification', (data) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.type).toBe('INVOICE_OVERDUE');
        expect(data.priority).toBe('HIGH');
        expect(data.data.invoiceId).toBe('inv123');
        done();
      });

      setTimeout(() => {
        ioServer.to(`user_${mockUser.id}`).emit('notification', {
          ...targetedNotification,
          timestamp: new Date().toISOString(),
          id: 'notification_123',
        });
      }, 100);
    });

    test('should broadcast to roles', (done) => {
      const roleBasedNotification = {
        roles: ['ADMIN', 'MANAGER'],
        companyId: mockCompany.id,
        type: 'SYSTEM_MAINTENANCE',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2 AM EST',
        scheduledFor: '2024-03-16T06:00:00Z',
      };

      clientSocket1.emit('join_role_room', { 
        role: 'ADMIN',
        companyId: mockCompany.id 
      });
      
      clientSocket1.on('role_notification', (data) => {
        expect(data.roles).toContain('ADMIN');
        expect(data.type).toBe('SYSTEM_MAINTENANCE');
        expect(data.companyId).toBe(mockCompany.id);
        done();
      });

      setTimeout(() => {
        ioServer.to(`role_ADMIN_${mockCompany.id}`).emit('role_notification', {
          ...roleBasedNotification,
          timestamp: new Date().toISOString(),
          id: 'notification_role_123',
        });
      }, 100);
    });

    test('should handle notification acknowledgment', (done) => {
      const notificationId = 'notification_456';
      
      clientSocket1.emit('acknowledge_notification', {
        notificationId,
        userId: mockUser.id,
        acknowledgedAt: new Date(),
      });

      clientSocket1.on('notification_acknowledged', (data) => {
        expect(data.notificationId).toBe(notificationId);
        expect(data.success).toBe(true);
        done();
      });

      // Simulate server response
      setTimeout(() => {
        clientSocket1.emit('notification_acknowledged', {
          notificationId,
          success: true,
          timestamp: new Date().toISOString(),
        });
      }, 100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid room join attempts', (done) => {
      clientSocket1.emit('join_company_room', { companyId: 'invalid-company-id' });
      
      clientSocket1.on('error', (error) => {
        expect(error.message).toContain('Invalid company');
        expect(error.code).toBe('INVALID_COMPANY');
        done();
      });
    });

    test('should handle message rate limiting', (done) => {
      let messageCount = 0;
      const maxMessages = 100;
      
      // Simulate rapid message sending
      for (let i = 0; i < maxMessages + 10; i++) {
        clientSocket1.emit('test_message', { count: i });
      }

      clientSocket1.on('rate_limit_exceeded', (data) => {
        expect(data.limit).toBe(maxMessages);
        expect(data.timeWindow).toBeDefined();
        done();
      });

      // If no rate limiting, test will timeout and fail
      setTimeout(() => {
        done(new Error('Rate limiting should have been triggered'));
      }, 5000);
    });

    test('should handle connection drops gracefully', (done) => {
      const volatileClient = Client((httpServer.address() as any).port, {
        auth: { token: authToken },
        forceNew: true,
      });

      let reconnected = false;

      volatileClient.on('connect', () => {
        if (!reconnected) {
          // Force disconnect
          volatileClient.disconnect();
        } else {
          // Successfully reconnected
          expect(volatileClient.connected).toBe(true);
          volatileClient.close();
          done();
        }
      });

      volatileClient.on('reconnect', () => {
        reconnected = true;
      });

      volatileClient.on('connect_error', (error) => {
        done(new Error(`Unexpected connection error: ${error.message}`));
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple simultaneous connections', (done) => {
      const numberOfClients = 50;
      const clients: any[] = [];
      let connectedClients = 0;

      for (let i = 0; i < numberOfClients; i++) {
        const client = Client((httpServer.address() as any).port, {
          auth: { token: authToken },
          forceNew: true,
        });

        client.on('connect', () => {
          connectedClients++;
          if (connectedClients === numberOfClients) {
            expect(connectedClients).toBe(numberOfClients);
            
            // Close all clients
            clients.forEach(c => c.close());
            done();
          }
        });

        clients.push(client);
      }
    });

    test('should broadcast efficiently to large rooms', (done) => {
      const roomSize = 100;
      const clients: any[] = [];
      let messagesReceived = 0;

      // Create multiple clients and join them to same room
      for (let i = 0; i < roomSize; i++) {
        const client = Client((httpServer.address() as any).port, {
          auth: { token: authToken },
          forceNew: true,
        });

        client.on('connect', () => {
          client.emit('join_company_room', { companyId: mockCompany.id });
        });

        client.on('test_broadcast', () => {
          messagesReceived++;
          if (messagesReceived === roomSize) {
            expect(messagesReceived).toBe(roomSize);
            clients.forEach(c => c.close());
            done();
          }
        });

        clients.push(client);
      }

      // Wait for all to connect, then broadcast
      setTimeout(() => {
        ioServer.to(`company_${mockCompany.id}`).emit('test_broadcast', {
          message: 'Performance test broadcast',
        });
      }, 1000);
    });
  });
});