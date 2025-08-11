import { Router } from 'express';
import { branchController } from '../controllers/branch.controller';
import {
  authenticateToken,
  requireAdmin,
  requireSameCompany,
} from '../middleware/auth.middleware';
import {
  validators,
  paginationValidation,
  handleValidationErrors,
  idParamValidation,
} from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import { auditLog } from '../middleware/logging.middleware';

const router = Router();

// Validation rules for branch creation
const createBranchValidation = [
  validators.isString('name', 2, 100),
  body('type')
    .isIn(['MAIN', 'SECONDARY'])
    .withMessage('Invalid branch type'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Invalid branch status'),
  body('address')
    .isObject()
    .withMessage('Address is required and must be an object'),
  body('address.street')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Street address is required and must be 1-255 characters'),
  body('address.city')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('City is required and must be 1-100 characters'),
  body('address.state')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('State must be a string with max 100 characters'),
  body('address.postalCode')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Postal code must be a string with max 20 characters'),
  body('address.country')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country is required and must be 1-100 characters'),
  validators.optionalString('phone', 20),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a number between -90 and 90'),
  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a number between -180 and 180'),
  body('services')
    .optional()
    .isArray()
    .withMessage('Services must be an array'),
  body('resources')
    .optional()
    .isArray()
    .withMessage('Resources must be an array'),
  body('staffIds')
    .optional()
    .isArray()
    .withMessage('Staff IDs must be an array'),
  handleValidationErrors,
];

// Validation rules for branch update
const updateBranchValidation = [
  validators.optionalString('name', 100),
  body('type')
    .optional()
    .isIn(['MAIN', 'SECONDARY'])
    .withMessage('Invalid branch type'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Invalid branch status'),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  validators.optionalString('phone', 20),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('services')
    .optional()
    .isArray()
    .withMessage('Services must be an array'),
  body('resources')
    .optional()
    .isArray()
    .withMessage('Resources must be an array'),
  body('staffIds')
    .optional()
    .isArray()
    .withMessage('Staff IDs must be an array'),
  validators.optionalBoolean('isActive'),
  handleValidationErrors,
];

// Validation for operating hours update
const updateOperatingHoursValidation = [
  body('operatingHours')
    .isObject()
    .withMessage('Operating hours must be an object'),
  handleValidationErrors,
];

// Validation for staff assignment
const assignStaffValidation = [
  body('staffIds')
    .isArray()
    .withMessage('Staff IDs must be an array')
    .custom((value) => {
      if (value.some((id: any) => typeof id !== 'string')) {
        throw new Error('All staff IDs must be strings');
      }
      return true;
    }),
  handleValidationErrors,
];

// Validation for service assignment
const assignServicesValidation = [
  body('serviceIds')
    .isArray()
    .withMessage('Service IDs must be an array')
    .custom((value) => {
      if (value.some((id: any) => typeof id !== 'string')) {
        throw new Error('All service IDs must be strings');
      }
      return true;
    }),
  handleValidationErrors,
];

// Validation for resource assignment
const assignResourcesValidation = [
  body('resourceIds')
    .isArray()
    .withMessage('Resource IDs must be an array')
    .custom((value) => {
      if (value.some((id: any) => typeof id !== 'string')) {
        throw new Error('All resource IDs must be strings');
      }
      return true;
    }),
  handleValidationErrors,
];

// Parameter validation
// Note: Prisma uses CUIDs by default, not UUIDs
// CUIDs are 25 characters, but we'll be flexible to support both UUIDs and CUIDs
const companyBranchParams = [
  param('companyId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid company ID'),
  param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
  handleValidationErrors,
];

const companyParams = [
  param('companyId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid company ID'),
  handleValidationErrors,
];

/**
 * @route   GET /api/v1/companies/:companyId/branches
 * @desc    List all branches for a company
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:companyId/branches',
  authenticateToken,
  companyParams,
  paginationValidation,
  branchController.listBranches
);

/**
 * @route   POST /api/v1/companies/:companyId/branches
 * @desc    Create a new branch
 * @access  Private (Admin/Manager of company)
 */
router.post(
  '/:companyId/branches',
  authenticateToken,
  requireAdmin,
  companyParams,
  createBranchValidation,
  auditLog('CREATE', 'BRANCH'),
  branchController.createBranch
);

/**
 * @route   GET /api/v1/companies/:companyId/branches/:branchId
 * @desc    Get branch details
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:companyId/branches/:branchId',
  authenticateToken,
  companyBranchParams,
  branchController.getBranch
);

/**
 * @route   PUT /api/v1/companies/:companyId/branches/:branchId
 * @desc    Update branch
 * @access  Private (Admin/Manager of company)
 */
router.put(
  '/:companyId/branches/:branchId',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  updateBranchValidation,
  auditLog('UPDATE', 'BRANCH'),
  branchController.updateBranch
);

/**
 * @route   DELETE /api/v1/companies/:companyId/branches/:branchId
 * @desc    Delete branch (soft delete)
 * @access  Private (Admin of company)
 */
router.delete(
  '/:companyId/branches/:branchId',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  auditLog('DELETE', 'BRANCH'),
  branchController.deleteBranch
);

/**
 * @route   POST /api/v1/companies/:companyId/branches/:branchId/set-default
 * @desc    Set branch as default/main
 * @access  Private (Admin of company)
 */
router.post(
  '/:companyId/branches/:branchId/set-default',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  auditLog('UPDATE', 'BRANCH'),
  branchController.setDefaultBranch
);

/**
 * @route   GET /api/v1/companies/:companyId/branches/:branchId/operating-hours
 * @desc    Get branch operating hours
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:companyId/branches/:branchId/operating-hours',
  authenticateToken,
  companyBranchParams,
  branchController.getOperatingHours
);

/**
 * @route   PUT /api/v1/companies/:companyId/branches/:branchId/operating-hours
 * @desc    Update branch operating hours
 * @access  Private (Admin/Manager of company)
 */
router.put(
  '/:companyId/branches/:branchId/operating-hours',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  updateOperatingHoursValidation,
  auditLog('UPDATE', 'BRANCH'),
  branchController.updateOperatingHours
);

/**
 * @route   PUT /api/v1/companies/:companyId/branches/:branchId/staff
 * @desc    Assign staff to branch
 * @access  Private (Admin of company)
 */
router.put(
  '/:companyId/branches/:branchId/staff',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  assignStaffValidation,
  auditLog('UPDATE', 'BRANCH'),
  branchController.assignStaff
);

/**
 * @route   PUT /api/v1/companies/:companyId/branches/:branchId/services
 * @desc    Assign services to branch
 * @access  Private (Admin of company)
 */
router.put(
  '/:companyId/branches/:branchId/services',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  assignServicesValidation,
  auditLog('UPDATE', 'BRANCH'),
  branchController.assignServices
);

/**
 * @route   PUT /api/v1/companies/:companyId/branches/:branchId/resources
 * @desc    Assign resources to branch
 * @access  Private (Admin of company)
 */
router.put(
  '/:companyId/branches/:branchId/resources',
  authenticateToken,
  requireAdmin,
  companyBranchParams,
  assignResourcesValidation,
  auditLog('UPDATE', 'BRANCH'),
  branchController.assignResources
);

/**
 * @route   GET /api/v1/companies/:companyId/branches/count
 * @desc    Get branch count for company
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:companyId/branches/count',
  authenticateToken,
  companyParams,
  branchController.getBranchCount
);

// New branch-specific settings endpoints (single branch operations)

/**
 * @route   GET /api/v1/branches/:branchId/settings
 * @desc    Get branch settings
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:branchId/settings',
  authenticateToken,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    handleValidationErrors,
  ],
  branchController.getBranchSettings
);

/**
 * @route   PUT /api/v1/branches/:branchId/settings
 * @desc    Update branch settings
 * @access  Private (Admin/Manager of company)
 */
router.put(
  '/:branchId/settings',
  authenticateToken,
  requireAdmin,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    body('allowOnlineBooking')
      .optional()
      .isBoolean()
      .withMessage('Allow online booking must be a boolean'),
    body('autoConfirmAppointments')
      .optional()
      .isBoolean()
      .withMessage('Auto confirm appointments must be a boolean'),
    body('requireDepositForBooking')
      .optional()
      .isBoolean()
      .withMessage('Require deposit for booking must be a boolean'),
    body('depositAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Deposit amount must be a positive number'),
    body('cancellationHours')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Cancellation hours must be a positive integer'),
    handleValidationErrors,
  ],
  auditLog('UPDATE', 'BRANCH_SETTINGS'),
  branchController.updateBranchSettings
);

/**
 * @route   GET /api/v1/branches/:branchId/working-hours
 * @desc    Get branch working hours
 * @access  Private (Admin/Manager/User of company)
 */
router.get(
  '/:branchId/working-hours',
  authenticateToken,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    handleValidationErrors,
  ],
  branchController.getBranchWorkingHours
);

/**
 * @route   PUT /api/v1/branches/:branchId/working-hours
 * @desc    Update branch working hours
 * @access  Private (Admin/Manager of company)
 */
router.put(
  '/:branchId/working-hours',
  authenticateToken,
  requireAdmin,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    body('operatingHours')
      .optional()
      .isObject()
      .withMessage('Operating hours must be an object'),
    // Add specific day validation if needed
    body('operatingHours.monday')
      .optional()
      .isObject()
      .withMessage('Monday schedule must be an object'),
    body('operatingHours.tuesday')
      .optional()
      .isObject()
      .withMessage('Tuesday schedule must be an object'),
    body('operatingHours.wednesday')
      .optional()
      .isObject()
      .withMessage('Wednesday schedule must be an object'),
    body('operatingHours.thursday')
      .optional()
      .isObject()
      .withMessage('Thursday schedule must be an object'),
    body('operatingHours.friday')
      .optional()
      .isObject()
      .withMessage('Friday schedule must be an object'),
    body('operatingHours.saturday')
      .optional()
      .isObject()
      .withMessage('Saturday schedule must be an object'),
    body('operatingHours.sunday')
      .optional()
      .isObject()
      .withMessage('Sunday schedule must be an object'),
    handleValidationErrors,
  ],
  auditLog('UPDATE', 'BRANCH_WORKING_HOURS'),
  branchController.updateBranchWorkingHours
);

/**
 * @route   POST /api/v1/branches/:branchId/activate
 * @desc    Activate branch
 * @access  Private (Admin of company)
 */
router.post(
  '/:branchId/activate',
  authenticateToken,
  requireAdmin,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    handleValidationErrors,
  ],
  auditLog('UPDATE', 'BRANCH'),
  branchController.activateBranch
);

/**
 * @route   POST /api/v1/branches/:branchId/deactivate
 * @desc    Deactivate branch
 * @access  Private (Admin of company)
 */
router.post(
  '/:branchId/deactivate',
  authenticateToken,
  requireAdmin,
  [
    param('branchId').isString().isLength({ min: 20, max: 40 }).withMessage('Invalid branch ID'),
    handleValidationErrors,
  ],
  auditLog('UPDATE', 'BRANCH'),
  branchController.deactivateBranch
);

export default router;