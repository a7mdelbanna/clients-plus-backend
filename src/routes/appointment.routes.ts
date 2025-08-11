import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import recurringRoutes from './recurring.routes';
// import { tenantMiddleware } from '../middleware/tenant.middleware';
// import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication and tenant middleware to admin routes
router.use('/', authenticateToken); // , tenantMiddleware);

// Special Routes (must come before /:id routes)
router.get('/availability', appointmentController.getAvailableSlots.bind(appointmentController));
router.get('/calendar', appointmentController.getCalendarView.bind(appointmentController));
router.post('/bulk', appointmentController.bulkAppointmentOperation.bind(appointmentController));

// Availability Routes (Admin)
router.post('/availability/check', appointmentController.checkSlotAvailability.bind(appointmentController));
router.post('/availability/bulk', appointmentController.getBulkAvailability.bind(appointmentController));

// Admin Appointment Management Routes
router.get('/', appointmentController.getAppointments.bind(appointmentController));
router.get('/:id', appointmentController.getAppointment.bind(appointmentController));
router.post('/', appointmentController.createAppointment.bind(appointmentController));
router.put('/:id', appointmentController.updateAppointment.bind(appointmentController));
router.delete('/:id', appointmentController.cancelAppointment.bind(appointmentController));

// Appointment Status Management Routes
router.post('/:id/reschedule', appointmentController.rescheduleAppointment.bind(appointmentController));
router.post('/:id/confirm', appointmentController.confirmAppointment.bind(appointmentController));
router.post('/:id/check-in', appointmentController.checkInAppointment.bind(appointmentController));
router.post('/:id/start', appointmentController.startAppointment.bind(appointmentController));
router.post('/:id/complete', appointmentController.completeAppointment.bind(appointmentController));
router.post('/:id/no-show', appointmentController.markNoShow.bind(appointmentController));

// Advanced Appointment Management Routes
router.get('/clients/:clientId/history', appointmentController.getClientAppointmentHistory.bind(appointmentController));
router.get('/staff/:staffId/schedule', appointmentController.getStaffSchedule.bind(appointmentController));
router.get('/conflicts', appointmentController.getAppointmentConflicts.bind(appointmentController));
router.get('/analytics', appointmentController.getAppointmentAnalytics.bind(appointmentController));

// Appointment Enhancement Routes
router.put('/:id/notes', appointmentController.updateAppointmentNotes.bind(appointmentController));
router.post('/:id/attachments', appointmentController.addAppointmentAttachment.bind(appointmentController));
router.post('/:id/reschedule/suggestions', appointmentController.findOptimalRescheduleTime.bind(appointmentController));

// Statistics and Reporting Routes
router.get('/statistics/no-shows', appointmentController.getNoShowStatistics.bind(appointmentController));

// Recurring Appointment Routes
router.use('/recurring', recurringRoutes);

export default router;