import { Router } from 'express';
import { recurringAppointmentController } from '../controllers/recurring.controller';
import { authenticateToken, requireAnyRole } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Recurring Series Management Routes
router.post('/', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]), 
  recurringAppointmentController.createRecurringSeries.bind(recurringAppointmentController)
);

router.get('/:groupId', 
  recurringAppointmentController.getRecurringSeries.bind(recurringAppointmentController)
);

router.put('/:groupId', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
  recurringAppointmentController.updateRecurringSeries.bind(recurringAppointmentController)
);

router.delete('/:groupId', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
  recurringAppointmentController.deleteRecurringSeries.bind(recurringAppointmentController)
);

// Company recurring series overview
router.get('/', 
  recurringAppointmentController.getCompanyRecurringSeries.bind(recurringAppointmentController)
);

// Individual occurrence management
router.post('/:groupId/occurrences/:appointmentId/skip', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
  recurringAppointmentController.skipOccurrence.bind(recurringAppointmentController)
);

router.post('/:groupId/occurrences/:appointmentId/reschedule', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
  recurringAppointmentController.rescheduleOccurrence.bind(recurringAppointmentController)
);

// Preview and analysis
router.get('/:groupId/preview', 
  recurringAppointmentController.previewUpcomingOccurrences.bind(recurringAppointmentController)
);

router.post('/check-conflicts', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]),
  recurringAppointmentController.checkRecurringConflicts.bind(recurringAppointmentController)
);

// Statistics and reporting
router.get('/statistics/overview', requireAnyRole([UserRole.ADMIN, UserRole.MANAGER]),
  recurringAppointmentController.getRecurringStatistics.bind(recurringAppointmentController)
);

export default router;