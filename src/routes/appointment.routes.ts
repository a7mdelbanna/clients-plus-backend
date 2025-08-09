import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication and tenant middleware to admin routes
router.use('/api/v1/appointments', authMiddleware, tenantMiddleware);

// Admin Appointment Management Routes
router.get('/api/v1/appointments', appointmentController.getAppointments.bind(appointmentController));
router.get('/api/v1/appointments/:id', appointmentController.getAppointment.bind(appointmentController));
router.post('/api/v1/appointments', appointmentController.createAppointment.bind(appointmentController));
router.put('/api/v1/appointments/:id', appointmentController.updateAppointment.bind(appointmentController));
router.delete('/api/v1/appointments/:id/cancel', appointmentController.cancelAppointment.bind(appointmentController));

// Appointment Status Management Routes
router.post('/api/v1/appointments/:id/reschedule', appointmentController.rescheduleAppointment.bind(appointmentController));
router.post('/api/v1/appointments/:id/check-in', appointmentController.checkInAppointment.bind(appointmentController));
router.post('/api/v1/appointments/:id/start', appointmentController.startAppointment.bind(appointmentController));
router.post('/api/v1/appointments/:id/complete', appointmentController.completeAppointment.bind(appointmentController));
router.post('/api/v1/appointments/:id/no-show', appointmentController.markNoShow.bind(appointmentController));

// Availability Routes (Admin)
router.get('/api/v1/availability/slots', appointmentController.getAvailableSlots.bind(appointmentController));
router.post('/api/v1/availability/check', appointmentController.checkSlotAvailability.bind(appointmentController));
router.post('/api/v1/availability/bulk', appointmentController.getBulkAvailability.bind(appointmentController));

// Public Booking Routes (No authentication required)
// Apply rate limiting for public endpoints
router.use('/api/v1/booking', rateLimitMiddleware({ max: 10, windowMs: 60000 })); // 10 requests per minute

// Get public availability
router.post('/api/v1/booking/:companyId/availability', appointmentController.getPublicAvailability.bind(appointmentController));

// Create public booking
router.post('/api/v1/booking/:companyId/book', appointmentController.createPublicBooking.bind(appointmentController));

// Get client bookings (by phone)
router.get('/api/v1/booking/:companyId/my-bookings', appointmentController.getClientBookings.bind(appointmentController));

// Cancel public booking
router.post('/api/v1/booking/cancel/:id', appointmentController.cancelPublicBooking.bind(appointmentController));

// Bulk availability for calendar view
router.post('/api/v1/booking/:companyId/bulk-availability', appointmentController.getBulkAvailability.bind(appointmentController));

// Waitlist Routes (Public)
router.post('/api/v1/booking/:companyId/waitlist', appointmentController.addToWaitlist.bind(appointmentController));
router.delete('/api/v1/booking/waitlist/:id', appointmentController.removeFromWaitlist.bind(appointmentController));

// Recurring Appointment Routes (Admin only)
router.use('/api/v1/recurring', authMiddleware, tenantMiddleware);

// TODO: Implement recurring-specific routes
// router.post('/api/v1/recurring', recurringController.createRecurringSeries);
// router.put('/api/v1/recurring/:groupId', recurringController.updateRecurringSeries);
// router.delete('/api/v1/recurring/:groupId', recurringController.deleteRecurringSeries);
// router.get('/api/v1/recurring/:groupId', recurringController.getRecurringSeries);

export default router;