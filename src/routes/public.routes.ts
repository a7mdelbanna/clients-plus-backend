import { Router } from 'express';
import { appointmentController } from '../controllers/appointment.controller';
import { serviceController } from '../controllers/service.controller';
import { branchController } from '../controllers/branch.controller';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';
// import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

// Public rate limiting middleware could be applied here
// router.use(rateLimitMiddleware({ max: 10, windowMs: 60000 })); // 10 requests per minute

// Validation for company/branch context
const companyIdValidation = [
  param('companyId').isUUID().withMessage('Invalid company ID'),
  handleValidationErrors,
];

const branchIdValidation = [
  param('branchId').isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
];

const availabilityValidation = [
  body('serviceId').isUUID().withMessage('Service ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
];

const bookingValidation = [
  body('serviceId').isUUID().withMessage('Service ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid appointment time is required (HH:MM)'),
  body('clientName').isString().isLength({ min: 2, max: 100 }).withMessage('Client name must be 2-100 characters'),
  body('clientPhone').isString().isLength({ min: 10, max: 20 }).withMessage('Valid phone number is required'),
  body('clientEmail').optional().isEmail().withMessage('Valid email is required'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  body('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
];

// Public Services Endpoint
/**
 * @route   GET /api/v1/public/services
 * @desc    Get list of services available for public booking
 * @access  Public
 */
router.get('/services', 
  query('companyId').isUUID().withMessage('Company ID is required'),
  query('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
  serviceController.getOnlineBookableServices
);

// Public Branches Endpoint  
/**
 * @route   GET /api/v1/public/branches
 * @desc    Get list of branches for a company
 * @access  Public
 */
router.get('/branches',
  query('companyId').isUUID().withMessage('Company ID is required'),
  handleValidationErrors,
  branchController.getPublicBranches
);

// Public Availability Endpoint
/**
 * @route   GET /api/v1/public/availability
 * @desc    Check available time slots for booking
 * @access  Public
 */
router.get('/availability',
  query('companyId').isUUID().withMessage('Company ID is required'),
  query('serviceId').isUUID().withMessage('Service ID is required'),
  query('date').isISO8601().withMessage('Valid date is required'),
  query('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
  appointmentController.getPublicAvailability
);

// Public Booking Endpoint
/**
 * @route   POST /api/v1/public/booking
 * @desc    Create a new booking without authentication
 * @access  Public
 */
router.post('/booking',
  body('companyId').isUUID().withMessage('Company ID is required'),
  ...bookingValidation,
  appointmentController.createPublicBooking
);

// Get Client Bookings (by phone)
/**
 * @route   GET /api/v1/public/my-bookings
 * @desc    Get client's bookings by phone number
 * @access  Public
 */
router.get('/my-bookings',
  query('companyId').isUUID().withMessage('Company ID is required'),
  query('phone').isString().isLength({ min: 10, max: 20 }).withMessage('Valid phone number is required'),
  handleValidationErrors,
  appointmentController.getClientBookings
);

// Cancel Public Booking
/**
 * @route   POST /api/v1/public/cancel-booking/:id
 * @desc    Cancel a public booking
 * @access  Public
 */
router.post('/cancel-booking/:id',
  param('id').isUUID().withMessage('Invalid booking ID'),
  body('phone').isString().isLength({ min: 10, max: 20 }).withMessage('Phone number is required for verification'),
  handleValidationErrors,
  appointmentController.cancelPublicBooking
);

// Bulk Availability for Calendar View
/**
 * @route   POST /api/v1/public/bulk-availability
 * @desc    Get bulk availability for calendar view
 * @access  Public
 */
router.post('/bulk-availability',
  body('companyId').isUUID().withMessage('Company ID is required'),
  body('serviceId').isUUID().withMessage('Service ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
  appointmentController.getBulkAvailability
);

// Waitlist Routes (Public)
/**
 * @route   POST /api/v1/public/waitlist
 * @desc    Add client to waitlist
 * @access  Public
 */
router.post('/waitlist',
  body('companyId').isUUID().withMessage('Company ID is required'),
  body('serviceId').isUUID().withMessage('Service ID is required'),
  body('preferredDate').isISO8601().withMessage('Valid preferred date is required'),
  body('clientName').isString().isLength({ min: 2, max: 100 }).withMessage('Client name must be 2-100 characters'),
  body('clientPhone').isString().isLength({ min: 10, max: 20 }).withMessage('Valid phone number is required'),
  body('clientEmail').optional().isEmail().withMessage('Valid email is required'),
  body('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
  appointmentController.addToWaitlist
);

/**
 * @route   DELETE /api/v1/public/waitlist/:id
 * @desc    Remove client from waitlist
 * @access  Public
 */
router.delete('/waitlist/:id',
  param('id').isUUID().withMessage('Invalid waitlist entry ID'),
  body('phone').isString().isLength({ min: 10, max: 20 }).withMessage('Phone number is required for verification'),
  handleValidationErrors,
  appointmentController.removeFromWaitlist
);

export default router;