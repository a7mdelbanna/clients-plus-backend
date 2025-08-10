import { Router } from 'express';
import { setupController } from '../controllers/setup.controller';
import {
  authenticateToken,
  requireSameCompany,
} from '../middleware/auth.middleware';
import {
  validators,
  handleValidationErrors,
} from '../middleware/validation.middleware';
import { body } from 'express-validator';
import { auditLog } from '../middleware/logging.middleware';

const router = Router();

// Business Info Validation
const businessInfoValidation = [
  // Accept both 'name' and 'businessName' from frontend
  validators.optionalString('name', 100),
  validators.optionalString('businessName', 100),
  validators.optionalString('businessType', 100),
  validators.optionalString('businessCategory', 100),
  validators.optionalString('description', 500),
  validators.optionalString('phone', 20),
  validators.optionalString('email', 255),
  validators.optionalString('website', 255),
  validators.optionalString('logo', 500),
  // Accept both string and object formats for address
  body('address')
    .optional()
    .custom((value) => {
      // Allow both string and object formats
      if (typeof value === 'string' || typeof value === 'object') {
        return true;
      }
      throw new Error('Address must be a string or object');
    }),
  body('address.street')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Street must be a string with max 255 characters'),
  body('address.city')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('City must be a string with max 100 characters'),
  body('address.state')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('State must be a string with max 100 characters'),
  body('address.zipCode')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Zip code must be a string with max 20 characters'),
  body('address.country')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Country must be a string with max 100 characters'),
  // Additional frontend fields
  body('businessHours')
    .optional()
    .isObject()
    .withMessage('Business hours must be an object'),
  body('languages')
    .optional()
    .isArray()
    .withMessage('Languages must be an array'),
  body('currency')
    .optional()
    .isString()
    .isLength({ max: 10 })
    .withMessage('Currency must be a string with max 10 characters'),
  body('timezone')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Timezone must be a string with max 50 characters'),
  handleValidationErrors,
];

// Branch Validation - Custom validation that handles both string and object address formats
const branchValidation = [
  body('branches')
    .isArray({ min: 1 })
    .withMessage('Branches must be an array with at least one item'),
  // Custom validation for the entire branches array to handle complex validation logic
  body('branches')
    .custom((branches) => {
      if (!Array.isArray(branches) || branches.length === 0) {
        throw new Error('At least one branch is required');
      }

      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        
        // Validate branch name
        if (!branch.name || typeof branch.name !== 'string' || branch.name.trim().length === 0) {
          throw new Error(`Branch ${i + 1}: name is required and must be a non-empty string`);
        }
        if (branch.name.length > 100) {
          throw new Error(`Branch ${i + 1}: name must be max 100 characters`);
        }

        // Validate branch address (both string and object formats)
        if (!branch.address) {
          throw new Error(`Branch ${i + 1}: address is required`);
        }
        
        if (typeof branch.address === 'string') {
          if (branch.address.trim().length === 0) {
            throw new Error(`Branch ${i + 1}: address cannot be empty`);
          }
        } else if (typeof branch.address === 'object' && branch.address !== null) {
          // If address is object, validate required fields
          if (!branch.address.street || typeof branch.address.street !== 'string' || branch.address.street.trim().length === 0) {
            throw new Error(`Branch ${i + 1}: street address is required when using object format`);
          }
          if (!branch.address.city || typeof branch.address.city !== 'string' || branch.address.city.trim().length === 0) {
            throw new Error(`Branch ${i + 1}: city is required when using object format`);
          }
          if (branch.address.street && branch.address.street.length > 255) {
            throw new Error(`Branch ${i + 1}: street address must be max 255 characters`);
          }
          if (branch.address.city && branch.address.city.length > 100) {
            throw new Error(`Branch ${i + 1}: city must be max 100 characters`);
          }
        } else {
          throw new Error(`Branch ${i + 1}: address must be a string or object`);
        }

        // Validate isMain (required field)
        if (typeof branch.isMain !== 'boolean') {
          throw new Error(`Branch ${i + 1}: isMain must be a boolean`);
        }

        // Validate optional fields
        if (branch.phone && (typeof branch.phone !== 'string' || branch.phone.length > 20)) {
          throw new Error(`Branch ${i + 1}: phone must be a string with max 20 characters`);
        }
        
        if (branch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.email)) {
          throw new Error(`Branch ${i + 1}: invalid email format`);
        }

        if (branch.businessHours && typeof branch.businessHours !== 'object') {
          throw new Error(`Branch ${i + 1}: businessHours must be an object`);
        }

        if (branch.services && !Array.isArray(branch.services)) {
          throw new Error(`Branch ${i + 1}: services must be an array`);
        }

        if (branch.staff && !Array.isArray(branch.staff)) {
          throw new Error(`Branch ${i + 1}: staff must be an array`);
        }

        if (branch.capacity && (!Number.isInteger(Number(branch.capacity)) || Number(branch.capacity) < 0)) {
          throw new Error(`Branch ${i + 1}: capacity must be a positive number`);
        }

        if (branch.amenities && !Array.isArray(branch.amenities)) {
          throw new Error(`Branch ${i + 1}: amenities must be an array`);
        }

        if (branch.coordinates && typeof branch.coordinates !== 'object') {
          throw new Error(`Branch ${i + 1}: coordinates must be an object`);
        }
      }

      return true;
    }),
  handleValidationErrors,
];

// Team Info Validation
const teamInfoValidation = [
  body('teamSize')
    .optional()
    .isString()
    .isIn(['1-5', '6-20', '21-50', '51-100', '100+'])
    .withMessage('Team size must be one of: 1-5, 6-20, 21-50, 51-100, 100+'),
  // Support both array of strings and full member objects
  body('members')
    .optional()
    .isArray()
    .withMessage('Team members must be an array'),
  body('members.*.name')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Member name must be a string with max 100 characters'),
  body('members.*.email')
    .optional()
    .isEmail()
    .withMessage('Member email must be valid'),
  body('members.*.role')
    .optional()
    .isString()
    .withMessage('Member role must be a string'),
  body('members.*.permissions')
    .optional()
    .isArray()
    .withMessage('Member permissions must be an array'),
  body('departments')
    .optional()
    .isArray()
    .withMessage('Departments must be an array'),
  body('departments.*')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Each department must be a string with max 100 characters'),
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  body('roles.*')
    .optional()
    .custom((value) => {
      // Accept both string and object formats
      if (typeof value === 'string') {
        return value.length <= 100;
      } else if (typeof value === 'object' && value !== null) {
        // If it's an object, validate the structure
        if (value.id && typeof value.id === 'string' && 
            value.name && typeof value.name === 'string') {
          return true;
        }
      }
      return false;
    })
    .withMessage('Each role must be a string or an object with id and name'),
  body('invitations')
    .optional()
    .isArray()
    .withMessage('Invitations must be an array'),
  handleValidationErrors,
];

// Theme Validation
const themeValidation = [
  // Custom validation for theme fields
  body()
    .custom((value, { req }) => {
      // Check if either theme or themeId is provided
      const hasTheme = req.body.theme || req.body.themeId || req.body.id;
      if (!hasTheme) {
        throw new Error('Theme ID is required (provide theme, themeId, or id field)');
      }
      
      // Normalize themeId to theme for backward compatibility
      if (req.body.themeId && !req.body.theme) {
        req.body.theme = req.body.themeId;
      }
      if (req.body.id && !req.body.theme) {
        req.body.theme = req.body.id;
      }
      
      return true;
    }),
  body('theme')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theme must be max 50 characters'),
  body('themeId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Theme ID must be max 50 characters'),
  body('id')
    .optional()
    .isString()
    .withMessage('Theme ID must be a string'),
  body('name')
    .optional()
    .isString()
    .withMessage('Theme name must be a string'),
  body('primaryColor')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Primary color must be a valid hex color code'),
  body('secondaryColor')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Secondary color must be a valid hex color code'),
  body('accentColor')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Accent color must be a valid hex color code'),
  body('backgroundColor')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Background color must be a valid hex color code'),
  body('textColor')
    .optional()
    .isString()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Text color must be a valid hex color code'),
  body('logo')
    .optional()
    .isString()
    .withMessage('Logo must be a string'),
  body('favicon')
    .optional()
    .isString()
    .withMessage('Favicon must be a string'),
  body('isDark')
    .optional()
    .isBoolean()
    .withMessage('isDark must be a boolean'),
  body('customCss')
    .optional()
    .isString()
    .withMessage('Custom CSS must be a string'),
  body('fonts')
    .optional()
    .isObject()
    .withMessage('Fonts must be an object'),
  handleValidationErrors,
];

/**
 * @route   GET /api/v1/setup/status
 * @desc    Get setup completion status for a company
 * @access  Private (Company members only)
 */
router.get(
  '/status',
  authenticateToken,
  setupController.getSetupStatus
);

/**
 * @route   GET /api/v1/setup/progress
 * @desc    Get current setup progress and next step
 * @access  Private (Company members only)
 */
router.get(
  '/progress',
  authenticateToken,
  setupController.getSetupProgress
);

/**
 * @route   POST /api/v1/setup/progress
 * @desc    Save step progress (draft save)
 * @access  Private (Company members only)
 */
router.post(
  '/progress',
  authenticateToken,
  [
    body('step')
      .isInt({ min: 1, max: 10 })
      .withMessage('Step must be an integer between 1 and 10'),
    body('data')
      .isObject()
      .withMessage('Data must be an object'),
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date'),
    handleValidationErrors,
  ],
  auditLog('UPDATE', 'SETUP_PROGRESS'),
  setupController.saveStepProgress
);

/**
 * @route   POST /api/v1/setup/business-info
 * @desc    Save business information step
 * @access  Private (Company members only)
 */
router.post(
  '/business-info',
  authenticateToken,
  businessInfoValidation,
  auditLog('UPDATE', 'SETUP_BUSINESS_INFO'),
  setupController.saveBusinessInfo
);

/**
 * @route   POST /api/v1/setup/branches
 * @desc    Save branch/location data step
 * @access  Private (Company members only)
 */
router.post(
  '/branches',
  authenticateToken,
  branchValidation,
  auditLog('CREATE', 'SETUP_BRANCHES'),
  setupController.saveBranches
);

/**
 * @route   POST /api/v1/setup/team-info
 * @desc    Save team size and configuration step
 * @access  Private (Company members only)
 */
router.post(
  '/team-info',
  authenticateToken,
  teamInfoValidation,
  auditLog('UPDATE', 'SETUP_TEAM_INFO'),
  setupController.saveTeamInfo
);

/**
 * @route   POST /api/v1/setup/theme
 * @desc    Save selected theme step
 * @access  Private (Company members only)
 */
router.post(
  '/theme',
  authenticateToken,
  themeValidation,
  auditLog('UPDATE', 'SETUP_THEME'),
  setupController.saveTheme
);

/**
 * @route   POST /api/v1/setup/complete
 * @desc    Mark setup as complete
 * @access  Private (Company members only)
 */
router.post(
  '/complete',
  authenticateToken,
  auditLog('UPDATE', 'SETUP_COMPLETE'),
  setupController.completeSetup
);

/**
 * @route   DELETE /api/v1/setup/reset
 * @desc    Reset setup wizard (Admin only, for testing)
 * @access  Private (Admin or Super Admin only)
 */
router.delete(
  '/reset',
  authenticateToken,
  auditLog('UPDATE', 'SETUP_RESET'),
  setupController.resetSetup
);

export default router;