import express from 'express';
import { body, param, query } from 'express-validator';
import { serviceController } from '../controllers/service.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Validation schemas
const serviceValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Service name is required and must be between 1 and 255 characters'),
  
  body('startingPrice')
    .isFloat({ min: 0 })
    .withMessage('Starting price must be a positive number'),
  
  body('duration')
    .isObject()
    .withMessage('Duration must be an object'),
  
  body('duration.hours')
    .isInt({ min: 0, max: 23 })
    .withMessage('Duration hours must be between 0 and 23'),
  
  body('duration.minutes')
    .isInt({ min: 0, max: 59 })
    .withMessage('Duration minutes must be between 0 and 59'),
  
  body('onlineBooking')
    .isObject()
    .withMessage('Online booking settings must be an object'),
  
  body('onlineBooking.enabled')
    .isBoolean()
    .withMessage('Online booking enabled must be a boolean'),
  
  body('type')
    .optional()
    .isIn(['APPOINTMENT', 'GROUP_EVENT'])
    .withMessage('Service type must be APPOINTMENT or GROUP_EVENT'),
  
  body('categoryId')
    .optional()
    .isString()
    .trim()
    .withMessage('Category ID must be a string'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  
  body('vat')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('VAT must be between 0 and 1'),
  
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),
];

const categoryValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Category name is required and must be between 1 and 255 characters'),
  
  body('nameAr')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Arabic name must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code'),
  
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a positive integer'),
  
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean'),
];

const staffAssignmentValidation = [
  body('staff')
    .isArray({ min: 0 })
    .withMessage('Staff must be an array'),
  
  body('staff.*.staffId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Staff ID is required for each assignment'),
  
  body('staff.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Staff price must be a positive number'),
  
  body('staff.*.duration')
    .optional()
    .isObject()
    .withMessage('Staff duration must be an object'),
  
  body('staff.*.duration.hours')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Staff duration hours must be between 0 and 23'),
  
  body('staff.*.duration.minutes')
    .optional()
    .isInt({ min: 0, max: 59 })
    .withMessage('Staff duration minutes must be between 0 and 59'),
];

const reorderValidation = [
  body('serviceIds')
    .isArray({ min: 1 })
    .withMessage('Service IDs array is required'),
  
  body('serviceIds.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each service ID must be a valid string'),
];

// Service CRUD routes
router.post('/', serviceValidation, serviceController.createService);
router.get('/', serviceController.getServices);
router.get('/all', serviceController.getAllServices);
router.get('/search', serviceController.searchServices);
router.get('/online-booking', serviceController.getOnlineBookableServices);
router.post('/reorder', reorderValidation, serviceController.reorderServices);

router.get('/:id', 
  param('id').isString().trim().notEmpty().withMessage('Service ID is required'),
  serviceController.getService
);

router.put('/:id', 
  param('id').isString().trim().notEmpty().withMessage('Service ID is required'),
  ...serviceValidation.map(validation => validation.optional()),
  serviceController.updateService
);

router.delete('/:id', 
  param('id').isString().trim().notEmpty().withMessage('Service ID is required'),
  serviceController.deleteService
);

// Service staff management routes
router.get('/:id/staff', 
  param('id').isString().trim().notEmpty().withMessage('Service ID is required'),
  serviceController.getServiceStaff
);

router.post('/:id/staff', 
  param('id').isString().trim().notEmpty().withMessage('Service ID is required'),
  staffAssignmentValidation,
  serviceController.assignStaffToService
);

// Services by staff
router.get('/by-staff/:staffId', 
  param('staffId').isString().trim().notEmpty().withMessage('Staff ID is required'),
  serviceController.getServicesByStaff
);

// Services by category
router.get('/by-category/:categoryId', 
  param('categoryId').isString().trim().notEmpty().withMessage('Category ID is required'),
  serviceController.getServicesByCategory
);

// Service category routes
router.post('/categories', categoryValidation, serviceController.createCategory);
router.get('/categories', serviceController.getCategories);

router.put('/categories/:id', 
  param('id').isString().trim().notEmpty().withMessage('Category ID is required'),
  ...categoryValidation.map(validation => validation.optional()),
  serviceController.updateCategory
);

router.delete('/categories/:id', 
  param('id').isString().trim().notEmpty().withMessage('Category ID is required'),
  serviceController.deleteCategory
);

// Health check
router.get('/health', serviceController.healthCheck);

export default router;