import request from 'supertest';
import { Express } from 'express';
import { prisma } from '../../src/config/database';
import { AuthTestHelper } from '../helpers/auth';
import { TestDataFactory } from '../helpers/factories';
import { dbHelper, setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { inventoryService } from '../../src/services/inventory.service';
import { InventoryMovementType, UserRole } from '@prisma/client';

// Import app after all mocks
let app: Express;

// Test data
let testCompany: any;
let adminUser: any;
let testBranch1: any;
let testBranch2: any;
let testProduct1: any;
let testProduct2: any;
let adminToken: string;

describe('Inventory Service Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Create test company
    testCompany = await dbHelper.client.company.create({
      data: TestDataFactory.createCompany({
        id: 'inventory-test-company',
        name: 'Inventory Test Company',
        email: 'inventory@test.com',
      })
    });

    // Create admin user
    adminUser = await dbHelper.client.user.create({
      data: TestDataFactory.createAdminUser(testCompany.id, {
        id: 'inventory-admin',
        email: 'admin@inventory.test',
      })
    });

    // Create test branches
    testBranch1 = await dbHelper.client.branch.create({
      data: TestDataFactory.createBranch(testCompany.id, {
        id: 'branch-1',
        name: 'Main Branch',
      })
    });

    testBranch2 = await dbHelper.client.branch.create({
      data: TestDataFactory.createBranch(testCompany.id, {
        id: 'branch-2',
        name: 'Secondary Branch',
      })
    });

    // Create test products
    testProduct1 = await dbHelper.client.product.create({
      data: {
        id: 'product-1',
        companyId: testCompany.id,
        name: 'Test Product 1',
        sku: 'TEST-001',
        price: 25.99,
        trackInventory: true,
        lowStockThreshold: 10,
        active: true,
      }
    });

    testProduct2 = await dbHelper.client.product.create({
      data: {
        id: 'product-2',
        companyId: testCompany.id,
        name: 'Test Product 2',
        sku: 'TEST-002',
        price: 15.50,
        trackInventory: true,
        lowStockThreshold: 5,
        active: true,
      }
    });

    // Generate auth token
    adminToken = AuthTestHelper.generateToken({
      id: adminUser.id,
      email: adminUser.email,
      companyId: testCompany.id,
      role: UserRole.ADMIN,
    });
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up inventory and movement records before each test
    await dbHelper.client.inventoryMovement.deleteMany({
      where: {
        OR: [
          { branchId: testBranch1.id },
          { branchId: testBranch2.id },
        ]
      }
    });

    await dbHelper.client.inventory.deleteMany({
      where: {
        OR: [
          { branchId: testBranch1.id },
          { branchId: testBranch2.id },
        ]
      }
    });

    // Reset product stock
    await dbHelper.client.product.updateMany({
      where: { companyId: testCompany.id },
      data: { stock: 0 }
    });
  });

  describe('Inventory Levels Management', () => {
    beforeEach(async () => {
      // Create initial inventory records
      await dbHelper.client.inventory.createMany({
        data: [
          {
            productId: testProduct1.id,
            branchId: testBranch1.id,
            quantity: 50,
            reservedQuantity: 5,
          },
          {
            productId: testProduct1.id,
            branchId: testBranch2.id,
            quantity: 25,
            reservedQuantity: 0,
          },
          {
            productId: testProduct2.id,
            branchId: testBranch1.id,
            quantity: 3, // Below low stock threshold
            reservedQuantity: 0,
          },
        ]
      });

      // Update product total stock
      await dbHelper.client.product.update({
        where: { id: testProduct1.id },
        data: { stock: 75 }
      });

      await dbHelper.client.product.update({
        where: { id: testProduct2.id },
        data: { stock: 3 }
      });
    });

    describe('getInventoryLevels', () => {
      it('should get all inventory levels for company', async () => {
        const levels = await inventoryService.getInventoryLevels(testCompany.id);

        expect(levels).toHaveLength(3);
        
        // Check first product in branch 1
        const product1Branch1 = levels.find(l => l.productId === testProduct1.id && l.branchId === testBranch1.id);
        expect(product1Branch1).toMatchObject({
          productId: testProduct1.id,
          productName: 'Test Product 1',
          productSku: 'TEST-001',
          branchId: testBranch1.id,
          branchName: 'Main Branch',
          quantity: 50,
          reservedQuantity: 5,
          availableQuantity: 45,
          lowStockThreshold: 10,
          isLowStock: false,
          isOutOfStock: false,
        });

        // Check low stock product
        const product2Branch1 = levels.find(l => l.productId === testProduct2.id && l.branchId === testBranch1.id);
        expect(product2Branch1).toMatchObject({
          isLowStock: true,
          isOutOfStock: false,
          availableQuantity: 3,
        });
      });

      it('should filter inventory by branch', async () => {
        const levels = await inventoryService.getInventoryLevels(testCompany.id, testBranch1.id);

        expect(levels).toHaveLength(2);
        levels.forEach(level => {
          expect(level.branchId).toBe(testBranch1.id);
        });
      });

      it('should filter to show only low stock items', async () => {
        const levels = await inventoryService.getInventoryLevels(testCompany.id, undefined, true);

        expect(levels).toHaveLength(1);
        expect(levels[0]).toMatchObject({
          productId: testProduct2.id,
          isLowStock: true,
        });
      });
    });

    describe('getProductInventory', () => {
      it('should get inventory levels for specific product', async () => {
        const levels = await inventoryService.getProductInventory(testCompany.id, testProduct1.id);

        expect(levels).toHaveLength(2);
        levels.forEach(level => {
          expect(level.productId).toBe(testProduct1.id);
        });

        const branch1Level = levels.find(l => l.branchId === testBranch1.id);
        expect(branch1Level?.quantity).toBe(50);

        const branch2Level = levels.find(l => l.branchId === testBranch2.id);
        expect(branch2Level?.quantity).toBe(25);
      });

      it('should throw error for non-existent product', async () => {
        await expect(
          inventoryService.getProductInventory(testCompany.id, 'non-existent-product')
        ).rejects.toThrow('Product not found');
      });
    });

    describe('checkAvailability', () => {
      it('should check product availability correctly', async () => {
        const availability = await inventoryService.checkAvailability(
          testCompany.id,
          testProduct1.id,
          testBranch1.id,
          10
        );

        expect(availability).toMatchObject({
          available: true,
          currentStock: 50,
          reservedQuantity: 5,
          availableQuantity: 45,
        });
      });

      it('should detect insufficient stock', async () => {
        const availability = await inventoryService.checkAvailability(
          testCompany.id,
          testProduct1.id,
          testBranch1.id,
          50 // More than available (45)
        );

        expect(availability).toMatchObject({
          available: false,
          currentStock: 50,
          reservedQuantity: 5,
          availableQuantity: 45,
          message: 'Only 45 units available (5 reserved)',
        });
      });

      it('should handle non-tracked inventory products', async () => {
        // Create a non-tracked product
        const nonTrackedProduct = await dbHelper.client.product.create({
          data: {
            id: 'non-tracked-product',
            companyId: testCompany.id,
            name: 'Non-tracked Product',
            price: 10.00,
            trackInventory: false,
          }
        });

        const availability = await inventoryService.checkAvailability(
          testCompany.id,
          nonTrackedProduct.id,
          testBranch1.id,
          100
        );

        expect(availability).toMatchObject({
          available: true,
          currentStock: -1, // Unlimited
          availableQuantity: -1, // Unlimited
        });
      });
    });
  });

  describe('Stock Adjustments', () => {
    it('should adjust stock levels correctly', async () => {
      const adjustmentData = {
        productId: testProduct1.id,
        branchId: testBranch1.id,
        newQuantity: 100,
        reason: 'Stock count adjustment',
        notes: 'Physical count revealed discrepancy',
        performedBy: adminUser.id,
      };

      const movement = await inventoryService.adjustStock(testCompany.id, adjustmentData);

      expect(movement).toMatchObject({
        productId: testProduct1.id,
        branchId: testBranch1.id,
        type: InventoryMovementType.ADJUSTMENT,
        quantity: 100, // Difference from 0 to 100
        notes: expect.stringContaining('Stock count adjustment'),
      });

      // Verify inventory was updated
      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.quantity).toBe(100);
      expect(inventory?.lastCountDate).toBeTruthy();
    });

    it('should create inventory record if it does not exist', async () => {
      const adjustmentData = {
        productId: testProduct2.id,
        branchId: testBranch2.id, // No inventory exists for this combination
        newQuantity: 50,
        reason: 'Initial stock setup',
        performedBy: adminUser.id,
      };

      const movement = await inventoryService.adjustStock(testCompany.id, adjustmentData);

      expect(movement.quantity).toBe(50); // From 0 to 50

      // Verify inventory was created
      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct2.id,
            branchId: testBranch2.id,
          }
        }
      });

      expect(inventory).toBeTruthy();
      expect(inventory?.quantity).toBe(50);
    });

    it('should handle negative adjustments', async () => {
      // Create initial inventory
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 100,
          reservedQuantity: 0,
        }
      });

      const adjustmentData = {
        productId: testProduct1.id,
        branchId: testBranch1.id,
        newQuantity: 80,
        reason: 'Damaged goods removal',
        performedBy: adminUser.id,
      };

      const movement = await inventoryService.adjustStock(testCompany.id, adjustmentData);

      expect(movement.quantity).toBe(-20); // Decrease of 20
    });

    it('should throw error for invalid product', async () => {
      const adjustmentData = {
        productId: 'invalid-product',
        branchId: testBranch1.id,
        newQuantity: 50,
        reason: 'Test',
        performedBy: adminUser.id,
      };

      await expect(
        inventoryService.adjustStock(testCompany.id, adjustmentData)
      ).rejects.toThrow('Product not found');
    });

    it('should throw error for invalid branch', async () => {
      const adjustmentData = {
        productId: testProduct1.id,
        branchId: 'invalid-branch',
        newQuantity: 50,
        reason: 'Test',
        performedBy: adminUser.id,
      };

      await expect(
        inventoryService.adjustStock(testCompany.id, adjustmentData)
      ).rejects.toThrow('Branch not found');
    });
  });

  describe('Stock Transfers', () => {
    beforeEach(async () => {
      // Create initial inventory in source branch
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 50,
          reservedQuantity: 0,
        }
      });
    });

    it('should transfer stock between branches successfully', async () => {
      const transferData = {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch2.id,
        quantity: 20,
        notes: 'Transfer to secondary branch',
        performedBy: adminUser.id,
      };

      const result = await inventoryService.transferStock(testCompany.id, transferData);

      expect(result).toMatchObject({
        outMovement: expect.objectContaining({
          type: InventoryMovementType.TRANSFER,
          quantity: -20,
          branchId: testBranch1.id,
        }),
        inMovement: expect.objectContaining({
          type: InventoryMovementType.TRANSFER,
          quantity: 20,
          branchId: testBranch2.id,
        }),
      });

      // Verify source inventory decreased
      const sourceInventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });
      expect(sourceInventory?.quantity).toBe(30);

      // Verify destination inventory increased
      const destInventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch2.id,
          }
        }
      });
      expect(destInventory?.quantity).toBe(20);
      expect(destInventory?.lastRestocked).toBeTruthy();
    });

    it('should create destination inventory if it does not exist', async () => {
      const transferData = {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch2.id,
        quantity: 15,
        performedBy: adminUser.id,
      };

      await inventoryService.transferStock(testCompany.id, transferData);

      // Verify destination inventory was created
      const destInventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch2.id,
          }
        }
      });

      expect(destInventory).toBeTruthy();
      expect(destInventory?.quantity).toBe(15);
    });

    it('should prevent transfer with insufficient stock', async () => {
      const transferData = {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch2.id,
        quantity: 100, // More than available (50)
        performedBy: adminUser.id,
      };

      await expect(
        inventoryService.transferStock(testCompany.id, transferData)
      ).rejects.toThrow('Insufficient stock in source branch');
    });

    it('should prevent transfer to same branch', async () => {
      const transferData = {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch1.id, // Same branch
        quantity: 10,
        performedBy: adminUser.id,
      };

      await expect(
        inventoryService.transferStock(testCompany.id, transferData)
      ).rejects.toThrow('Cannot transfer to the same branch');
    });

    it('should use same reference for both movements', async () => {
      const transferData = {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch2.id,
        quantity: 10,
        performedBy: adminUser.id,
      };

      const result = await inventoryService.transferStock(testCompany.id, transferData);

      expect(result.outMovement.reference).toBeTruthy();
      expect(result.outMovement.reference).toBe(result.inMovement.reference);
      expect(result.outMovement.reference).toContain('TRF-');
    });
  });

  describe('Stock Movements', () => {
    it('should add stock with IN movement', async () => {
      const movement = await inventoryService.addStock(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        30,
        15.50, // Unit cost
        'PO-001',
        'Purchase order delivery',
        adminUser.id
      );

      expect(movement).toMatchObject({
        type: InventoryMovementType.IN,
        quantity: 30,
        unitCost: expect.anything(),
        reference: 'PO-001',
        notes: 'Purchase order delivery',
      });

      // Verify inventory was created/updated
      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.quantity).toBe(30);
      expect(inventory?.lastRestocked).toBeTruthy();
    });

    it('should remove stock with OUT movement', async () => {
      // Create initial inventory
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 50,
          reservedQuantity: 0,
        }
      });

      const movement = await inventoryService.removeStock(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        15,
        'SALE-001',
        'Product sold',
        adminUser.id
      );

      expect(movement).toMatchObject({
        type: InventoryMovementType.OUT,
        quantity: -15,
        reference: 'SALE-001',
        notes: 'Product sold',
      });

      // Verify inventory was decreased
      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.quantity).toBe(35);
    });

    it('should prevent removing more stock than available', async () => {
      // Create inventory with limited stock
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 10,
          reservedQuantity: 0,
        }
      });

      await expect(
        inventoryService.removeStock(
          testCompany.id,
          testProduct1.id,
          testBranch1.id,
          20, // More than available
          'SALE-002',
          'Oversell attempt',
          adminUser.id
        )
      ).rejects.toThrow('Insufficient stock for this operation');
    });

    it('should update product total stock across all movements', async () => {
      // Add stock to both branches
      await inventoryService.addStock(testCompany.id, testProduct1.id, testBranch1.id, 30);
      await inventoryService.addStock(testCompany.id, testProduct1.id, testBranch2.id, 20);

      // Check product total stock
      const product = await dbHelper.client.product.findUnique({
        where: { id: testProduct1.id }
      });

      expect(product?.stock).toBe(50);

      // Remove some stock
      await inventoryService.removeStock(testCompany.id, testProduct1.id, testBranch1.id, 10);

      // Check updated total
      const updatedProduct = await dbHelper.client.product.findUnique({
        where: { id: testProduct1.id }
      });

      expect(updatedProduct?.stock).toBe(40);
    });
  });

  describe('Stock Reservations', () => {
    beforeEach(async () => {
      // Create inventory for reservation tests
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 50,
          reservedQuantity: 0,
        }
      });
    });

    it('should reserve stock successfully', async () => {
      await inventoryService.reserveStock(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        15,
        'ORDER-001'
      );

      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.reservedQuantity).toBe(15);
    });

    it('should prevent reserving more than available stock', async () => {
      // Reserve some stock first
      await inventoryService.reserveStock(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        30
      );

      // Try to reserve more than remaining available (50 - 30 = 20)
      await expect(
        inventoryService.reserveStock(
          testCompany.id,
          testProduct1.id,
          testBranch1.id,
          25
        )
      ).rejects.toThrow('Insufficient available stock for reservation');
    });

    it('should release reservations correctly', async () => {
      // Reserve stock first
      await inventoryService.reserveStock(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        20
      );

      // Release part of the reservation
      await inventoryService.releaseReservation(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        10
      );

      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.reservedQuantity).toBe(10);
    });

    it('should not allow negative reserved quantities', async () => {
      // Try to release more than reserved
      await inventoryService.releaseReservation(
        testCompany.id,
        testProduct1.id,
        testBranch1.id,
        10 // No reservations exist
      );

      const inventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(inventory?.reservedQuantity).toBe(0); // Should remain 0, not go negative
    });
  });

  describe('Movement History', () => {
    beforeEach(async () => {
      // Create some test movements
      await inventoryService.addStock(testCompany.id, testProduct1.id, testBranch1.id, 50, 10.00, 'PO-001');
      await inventoryService.removeStock(testCompany.id, testProduct1.id, testBranch1.id, 10, 'SALE-001');
      await inventoryService.addStock(testCompany.id, testProduct2.id, testBranch1.id, 25, 8.00, 'PO-002');
      await inventoryService.adjustStock(testCompany.id, {
        productId: testProduct1.id,
        branchId: testBranch2.id,
        newQuantity: 30,
        reason: 'Initial stock',
        performedBy: adminUser.id,
      });
    });

    it('should get all movements with pagination', async () => {
      const result = await inventoryService.getMovements(testCompany.id, {
        page: 1,
        limit: 2,
      });

      expect(result).toMatchObject({
        movements: expect.any(Array),
        total: 4,
        page: 1,
        limit: 2,
        totalPages: 2,
      });

      expect(result.movements).toHaveLength(2);
      
      // Should be ordered by createdAt desc (newest first)
      expect(result.movements[0].createdAt >= result.movements[1].createdAt).toBe(true);
    });

    it('should filter movements by product', async () => {
      const result = await inventoryService.getMovements(testCompany.id, {
        productId: testProduct1.id,
      });

      expect(result.movements).toHaveLength(3); // 2 movements for product1
      result.movements.forEach(movement => {
        expect(movement.productId).toBe(testProduct1.id);
      });
    });

    it('should filter movements by branch', async () => {
      const result = await inventoryService.getMovements(testCompany.id, {
        branchId: testBranch1.id,
      });

      result.movements.forEach(movement => {
        expect(movement.branchId).toBe(testBranch1.id);
      });
    });

    it('should filter movements by type', async () => {
      const result = await inventoryService.getMovements(testCompany.id, {
        type: InventoryMovementType.IN,
      });

      result.movements.forEach(movement => {
        expect(movement.type).toBe(InventoryMovementType.IN);
      });
    });

    it('should filter movements by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await inventoryService.getMovements(testCompany.id, {
        startDate: yesterday,
        endDate: tomorrow,
      });

      // Should get all movements created today
      expect(result.total).toBe(4);
    });
  });

  describe('Low Stock Alerts', () => {
    beforeEach(async () => {
      // Create inventory with some items below threshold
      await dbHelper.client.inventory.createMany({
        data: [
          {
            productId: testProduct1.id, // Threshold: 10
            branchId: testBranch1.id,
            quantity: 15, // Above threshold
            reservedQuantity: 0,
          },
          {
            productId: testProduct1.id,
            branchId: testBranch2.id,
            quantity: 5, // Below threshold (10)
            reservedQuantity: 0,
          },
          {
            productId: testProduct2.id, // Threshold: 5
            branchId: testBranch1.id,
            quantity: 3, // Below threshold (5)
            reservedQuantity: 0,
          },
        ]
      });
    });

    it('should get low stock alerts', async () => {
      const alerts = await inventoryService.getLowStockAlerts(testCompany.id);

      expect(alerts).toHaveLength(2);

      const alertProductIds = alerts.map(alert => alert.productId);
      expect(alertProductIds).toContain(testProduct1.id); // Branch 2
      expect(alertProductIds).toContain(testProduct2.id); // Branch 1

      alerts.forEach(alert => {
        expect(alert.isLowStock || alert.isOutOfStock).toBe(true);
      });
    });

    it('should get low stock alerts for specific branch', async () => {
      const alerts = await inventoryService.getLowStockAlerts(testCompany.id, testBranch1.id);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        productId: testProduct2.id,
        branchId: testBranch1.id,
        isLowStock: true,
      });
    });

    it('should detect out of stock items', async () => {
      // Create out of stock item
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct2.id,
          branchId: testBranch2.id,
          quantity: 0,
          reservedQuantity: 0,
        }
      });

      const alerts = await inventoryService.getLowStockAlerts(testCompany.id);

      const outOfStockAlert = alerts.find(alert => 
        alert.productId === testProduct2.id && alert.branchId === testBranch2.id
      );

      expect(outOfStockAlert).toMatchObject({
        isOutOfStock: true,
        availableQuantity: 0,
      });
    });

    it('should consider reserved quantities in stock calculations', async () => {
      // Update inventory to have reserved stock that makes it below threshold
      await dbHelper.client.inventory.update({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        },
        data: {
          quantity: 15,
          reservedQuantity: 10, // Available: 5, which is below threshold of 10
        }
      });

      const alerts = await inventoryService.getLowStockAlerts(testCompany.id);

      const alertForProduct1Branch1 = alerts.find(alert => 
        alert.productId === testProduct1.id && alert.branchId === testBranch1.id
      );

      expect(alertForProduct1Branch1).toMatchObject({
        isLowStock: true,
        availableQuantity: 5,
        reservedQuantity: 10,
      });
    });
  });

  describe('Inventory Valuation', () => {
    beforeEach(async () => {
      // Create inventory for valuation tests
      await dbHelper.client.inventory.createMany({
        data: [
          {
            productId: testProduct1.id, // Price: 25.99
            branchId: testBranch1.id,
            quantity: 10,
            reservedQuantity: 0,
          },
          {
            productId: testProduct1.id,
            branchId: testBranch2.id,
            quantity: 5,
            reservedQuantity: 0,
          },
          {
            productId: testProduct2.id, // Price: 15.50
            branchId: testBranch1.id,
            quantity: 8,
            reservedQuantity: 0,
          },
        ]
      });
    });

    it('should calculate total inventory valuation', async () => {
      const valuation = await inventoryService.getInventoryValuation(testCompany.id);

      // Expected: (10 * 25.99) + (5 * 25.99) + (8 * 15.50) = 389.85 + 124.00 = 513.85
      expect(valuation).toMatchObject({
        totalValue: 513.85,
        totalQuantity: 23,
        itemsCount: 3,
        averageCostPerUnit: expect.any(Number),
      });
    });

    it('should calculate valuation for specific branch', async () => {
      const valuation = await inventoryService.getInventoryValuation(testCompany.id, testBranch1.id);

      // Expected: (10 * 25.99) + (8 * 15.50) = 259.90 + 124.00 = 383.90
      expect(valuation).toMatchObject({
        totalValue: 383.90,
        totalQuantity: 18,
        itemsCount: 2,
      });
    });

    it('should use cost price when available for valuation', async () => {
      // Update product to have cost price
      await dbHelper.client.product.update({
        where: { id: testProduct1.id },
        data: { cost: 15.00 } // Lower than selling price
      });

      const valuation = await inventoryService.getInventoryValuation(testCompany.id, testBranch1.id);

      // Expected: (10 * 15.00) + (8 * 15.50) = 150.00 + 124.00 = 274.00
      expect(valuation.totalValue).toBe(274.00);
    });

    it('should handle empty inventory gracefully', async () => {
      // Clear all inventory
      await dbHelper.client.inventory.deleteMany({
        where: { branchId: { in: [testBranch1.id, testBranch2.id] } }
      });

      const valuation = await inventoryService.getInventoryValuation(testCompany.id);

      expect(valuation).toMatchObject({
        totalValue: 0,
        totalQuantity: 0,
        itemsCount: 0,
        averageCostPerUnit: 0,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle transactions correctly on failures', async () => {
      // This test ensures atomic operations
      const invalidTransferData = {
        productId: testProduct1.id,
        fromBranchId: 'invalid-branch',
        toBranchId: testBranch2.id,
        quantity: 10,
        performedBy: adminUser.id,
      };

      await expect(
        inventoryService.transferStock(testCompany.id, invalidTransferData)
      ).rejects.toThrow();

      // Verify no inventory records were created due to failed transaction
      const inventories = await dbHelper.client.inventory.findMany({
        where: { productId: testProduct1.id }
      });

      expect(inventories).toHaveLength(0);
    });

    it('should handle concurrent stock operations correctly', async () => {
      // Create initial inventory
      await dbHelper.client.inventory.create({
        data: {
          productId: testProduct1.id,
          branchId: testBranch1.id,
          quantity: 100,
          reservedQuantity: 0,
        }
      });

      // Simulate concurrent stock removals
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        inventoryService.removeStock(
          testCompany.id,
          testProduct1.id,
          testBranch1.id,
          5,
          `SALE-${i + 1}`,
          `Concurrent sale ${i + 1}`
        )
      );

      // All operations should complete successfully
      const results = await Promise.all(concurrentOperations);
      expect(results).toHaveLength(10);

      // Final inventory should be correct
      const finalInventory = await dbHelper.client.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: testProduct1.id,
            branchId: testBranch1.id,
          }
        }
      });

      expect(finalInventory?.quantity).toBe(50); // 100 - (10 * 5)
    });

    it('should maintain data consistency across related operations', async () => {
      // Perform multiple operations
      await inventoryService.addStock(testCompany.id, testProduct1.id, testBranch1.id, 50);
      await inventoryService.transferStock(testCompany.id, {
        productId: testProduct1.id,
        fromBranchId: testBranch1.id,
        toBranchId: testBranch2.id,
        quantity: 20,
        performedBy: adminUser.id,
      });
      await inventoryService.reserveStock(testCompany.id, testProduct1.id, testBranch1.id, 10);

      // Verify consistency
      const inventories = await dbHelper.client.inventory.findMany({
        where: { productId: testProduct1.id }
      });

      const totalQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      expect(totalQuantity).toBe(50); // Total should remain 50

      const product = await dbHelper.client.product.findUnique({
        where: { id: testProduct1.id }
      });

      expect(product?.stock).toBe(50); // Product total should match
    });
  });
});