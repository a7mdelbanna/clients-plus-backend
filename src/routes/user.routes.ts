import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import {
  authenticateToken,
  requireAdmin,
  requireManager,
} from '../middleware/auth.middleware';
import {
  validators,
  paginationValidation,
  handleValidationErrors,
} from '../middleware/validation.middleware';
import { body, param } from 'express-validator';
import { auditLog } from '../middleware/logging.middleware';

const router = Router();

// Validation rules for user creation
const createUserValidation = [
  validators.isEmail('email'),
  validators.isPassword('password'),
  validators.isString('firstName', 1, 50),
  validators.isString('lastName', 1, 50),
  validators.optionalString('phone', 20),
  validators.optionalString('avatar', 255),
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'STAFF', 'RECEPTIONIST'])
    .withMessage('Invalid role'),
  body('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  handleValidationErrors,
];

// Validation rules for user update
const updateUserValidation = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  validators.optionalString('firstName', 50),
  validators.optionalString('lastName', 50),
  validators.optionalString('phone', 20),
  validators.optionalString('avatar', 255),
  body('role')
    .optional()
    .isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'STAFF', 'RECEPTIONIST'])
    .withMessage('Invalid role'),
  validators.optionalBoolean('isActive'),
  handleValidationErrors,
];

// Validation for role update
const updateRoleValidation = [
  body('role')
    .isIn(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'STAFF', 'RECEPTIONIST'])
    .withMessage('Invalid role'),
  handleValidationErrors,
];

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticateToken,
  userController.getCurrentUser
);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private (Admin or Manager)
 */
router.post(
  '/',
  authenticateToken,
  requireManager, // Manager or higher can create users
  createUserValidation,
  auditLog('CREATE', 'USER'),
  userController.createUser
);

/**
 * @route   GET /api/v1/users
 * @desc    List users for current company
 * @access  Private (Manager or higher)
 */
router.get(
  '/',
  authenticateToken,
  requireManager,
  paginationValidation,
  userController.listUsers
);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Private (Manager or higher, or own profile)
 */
router.get(
  '/:userId',
  authenticateToken,
  param('userId').isUUID().withMessage('Invalid user ID'),
  handleValidationErrors,
  userController.getUser
);

/**
 * @route   PUT /api/v1/users/:userId
 * @desc    Update user
 * @access  Private (Admin or user updating own profile)
 */
router.put(
  '/:userId',
  authenticateToken,
  param('userId').isUUID().withMessage('Invalid user ID'),
  updateUserValidation,
  auditLog('UPDATE', 'USER'),
  userController.updateUser
);

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:userId',
  authenticateToken,
  requireAdmin,
  param('userId').isUUID().withMessage('Invalid user ID'),
  handleValidationErrors,
  auditLog('DELETE', 'USER'),
  userController.deleteUser
);

/**
 * @route   PUT /api/v1/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put(
  '/:userId/role',
  authenticateToken,
  requireAdmin,
  param('userId').isUUID().withMessage('Invalid user ID'),
  updateRoleValidation,
  auditLog('UPDATE', 'USER_ROLE'),
  userController.updateUserRole
);

/**
 * Company-scoped user routes
 */

/**
 * @route   GET /api/v1/companies/:companyId/users
 * @desc    List users for a specific company
 * @access  Private (Super Admin or company admin)
 */
router.get(
  '/companies/:companyId/users',
  authenticateToken,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  paginationValidation,
  userController.listUsers
);

/**
 * @route   GET /api/v1/companies/:companyId/users/stats
 * @desc    Get user statistics for a company
 * @access  Private (Admin or higher)
 */
router.get(
  '/companies/:companyId/users/stats',
  authenticateToken,
  requireManager,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  handleValidationErrors,
  userController.getUserStats
);

export default router;