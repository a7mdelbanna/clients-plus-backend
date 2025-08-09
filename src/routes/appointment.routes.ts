import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
// import { tenantMiddleware } from '../middleware/tenant.middleware';
// import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication and tenant middleware to admin routes
router.use('/', authenticateToken); // , tenantMiddleware);

// Admin Appointment Management Routes
router.get('/', appointmentController.getAppointments.bind(appointmentController));
router.get('/:id', appointmentController.getAppointment.bind(appointmentController));
router.post('/', appointmentController.createAppointment.bind(appointmentController));
router.put('/:id', appointmentController.updateAppointment.bind(appointmentController));
router.delete('/:id/cancel', appointmentController.cancelAppointment.bind(appointmentController));

// Appointment Status Management Routes
router.post('/:id/reschedule', appointmentController.rescheduleAppointment.bind(appointmentController));
router.post('/:id/check-in', appointmentController.checkInAppointment.bind(appointmentController));
router.post('/:id/start', appointmentController.startAppointment.bind(appointmentController));
router.post('/:id/complete', appointmentController.completeAppointment.bind(appointmentController));
router.post('/:id/no-show', appointmentController.markNoShow.bind(appointmentController));

// Availability Routes (Admin) - moved here since they were above
router.get('/availability/slots', appointmentController.getAvailableSlots.bind(appointmentController));
router.post('/availability/check', appointmentController.checkSlotAvailability.bind(appointmentController));
router.post('/availability/bulk', appointmentController.getBulkAvailability.bind(appointmentController));

// Recurring Appointment Routes (Admin only)
router.use('/recurring', authenticateToken); // , tenantMiddleware);

// TODO: Implement recurring-specific routes
// router.post('/recurring', recurringController.createRecurringSeries);
// router.put('/recurring/:groupId', recurringController.updateRecurringSeries);
// router.delete('/recurring/:groupId', recurringController.deleteRecurringSeries);
// router.get('/recurring/:groupId', recurringController.getRecurringSeries);

export default router;