import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import {
  authenticateToken,
  requireSuperAdmin,
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

// Validation rules for company creation
const createCompanyValidation = [
  validators.isString('name', 2, 100),
  validators.isEmail('email'),
  validators.optionalString('phone', 20),
  validators.optionalString('website', 255),
  validators.optionalString('businessType', 100),
  validators.optionalString('taxId', 50),
  validators.optionalString('registrationNumber', 50),
  body('subscriptionPlan')
    .optional()
    .isIn(['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'])
    .withMessage('Invalid subscription plan'),
  validators.optionalString('timezone', 50),
  validators.optionalString('currency', 10),
  validators.optionalString('dateFormat', 20),
  validators.optionalString('timeFormat', 10),
  handleValidationErrors,
];

// Validation rules for company update
const updateCompanyValidation = [
  validators.optionalString('name', 100),
  body('email').optional().isEmail().withMessage('Invalid email'),
  validators.optionalString('phone', 20),
  validators.optionalString('website', 255),
  validators.optionalString('businessType', 100),
  validators.optionalString('taxId', 50),
  validators.optionalString('registrationNumber', 50),
  body('subscriptionStatus')
    .optional()
    .isIn(['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'])
    .withMessage('Invalid subscription status'),
  body('billingCycle')
    .optional()
    .isIn(['MONTHLY', 'YEARLY'])
    .withMessage('Invalid billing cycle'),
  validators.optionalBoolean('isActive'),
  handleValidationErrors,
];

// Validation for subscription update
const updateSubscriptionValidation = [
  body('plan')
    .isIn(['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'])
    .withMessage('Invalid subscription plan'),
  body('billingCycle')
    .isIn(['MONTHLY', 'YEARLY'])
    .withMessage('Invalid billing cycle'),
  handleValidationErrors,
];

/**
 * @route   POST /api/v1/companies
 * @desc    Create a new company (Super Admin only)
 * @access  Private (Super Admin)
 */
router.post(
  '/',
  authenticateToken,
  requireSuperAdmin,
  createCompanyValidation,
  auditLog('CREATE', 'COMPANY'),
  companyController.createCompany
);

/**
 * @route   GET /api/v1/companies
 * @desc    List all companies (Super Admin only)
 * @access  Private (Super Admin)
 */
router.get(
  '/',
  authenticateToken,
  requireSuperAdmin,
  paginationValidation,
  companyController.listCompanies
);

/**
 * @route   GET /api/v1/companies/:companyId
 * @desc    Get company by ID
 * @access  Private (Admin or Super Admin)
 */
router.get(
  '/:companyId',
  authenticateToken,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  handleValidationErrors,
  companyController.getCompany
);

/**
 * @route   PUT /api/v1/companies/:companyId
 * @desc    Update company
 * @access  Private (Admin of company or Super Admin)
 */
router.put(
  '/:companyId',
  authenticateToken,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  updateCompanyValidation,
  auditLog('UPDATE', 'COMPANY'),
  companyController.updateCompany
);

/**
 * @route   DELETE /api/v1/companies/:companyId
 * @desc    Delete company (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete(
  '/:companyId',
  authenticateToken,
  requireSuperAdmin,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  handleValidationErrors,
  auditLog('DELETE', 'COMPANY'),
  companyController.deleteCompany
);

/**
 * @route   PUT /api/v1/companies/:companyId/subscription
 * @desc    Update company subscription
 * @access  Private (Super Admin only)
 */
router.put(
  '/:companyId/subscription',
  authenticateToken,
  requireSuperAdmin,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  updateSubscriptionValidation,
  auditLog('UPDATE', 'SUBSCRIPTION'),
  companyController.updateSubscription
);

/**
 * @route   GET /api/v1/companies/:companyId/stats
 * @desc    Get company statistics
 * @access  Private (Admin of company or Super Admin)
 */
router.get(
  '/:companyId/stats',
  authenticateToken,
  param('companyId').isUUID().withMessage('Invalid company ID'),
  handleValidationErrors,
  companyController.getCompanyStats
);

export default router;