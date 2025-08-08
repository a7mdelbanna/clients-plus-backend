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
const companyBranchParams = [
  param('companyId').isUUID().withMessage('Invalid company ID'),
  param('branchId').isUUID().withMessage('Invalid branch ID'),
  handleValidationErrors,
];

const companyParams = [
  param('companyId').isUUID().withMessage('Invalid company ID'),
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

export default router;