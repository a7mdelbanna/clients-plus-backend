import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { staffController } from '../controllers/staff.controller';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Staff CRUD operations
router.get('/', staffController.getStaff);
router.get('/stats', staffController.getStaffStats);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

// Staff filtering endpoints
router.get('/by-service/:serviceId', staffController.getStaffByService);
router.get('/by-branch/:branchId', staffController.getStaffByBranch);

// Service assignments
router.post('/:id/assign-service', staffController.assignService);
router.delete('/:id/unassign-service/:serviceId', staffController.unassignService);

// Branch assignments
router.post('/:id/assign-branch', staffController.assignBranch);
router.delete('/:id/unassign-branch/:branchId', staffController.unassignBranch);

// Staff ordering and management
router.post('/reorder', staffController.reorderStaff);
router.post('/:id/send-invitation', staffController.sendInvitation);

// Schedule management
router.get('/:id/schedule', staffController.getStaffSchedule);
router.put('/:id/schedule', staffController.updateStaffSchedule);
router.get('/:id/working-hours', staffController.getWorkingHours);
router.post('/:id/copy-schedule', staffController.copySchedule);

// Availability and time off
router.get('/:id/availability', staffController.getStaffAvailability);
router.get('/:id/next-available', staffController.getNextAvailableSlot);
router.post('/:id/time-off', staffController.requestTimeOff);
router.get('/:id/time-off', staffController.getTimeOffRecords);

// Commission and performance tracking
router.get('/:id/commission', staffController.getCommissionData);
router.get('/:id/performance', staffController.getPerformanceMetrics);
router.get('/:id/revenue', staffController.getRevenueAnalytics);
router.post('/:id/commission-rate', staffController.updateCommissionRate);

// Position/role management
router.get('/positions', staffController.getPositions);
router.post('/positions', staffController.createPosition);
router.put('/positions/:positionId', staffController.updatePosition);
router.delete('/positions/:positionId', staffController.deletePosition);

export default router;