// Authentication middleware
export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermissions,
  requireAnyRole,
  requireSameCompany,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireStaff,
  rateLimitSensitive,
  requireActiveCompany,
  authenticate,
  authenticateWithRole,
  authenticateWithPermissions,
  authenticateWithCompany,
} from './auth.middleware';

// Tenant isolation middleware
export {
  extractCompanyId,
  tenantIsolation,
  validateCompanyMembership,
  applyTenantFilter,
  autoTenantFilter,
  validateBranchAccess,
  validateStaffAccess,
  validateClientAccess,
  sanitizeTenantData,
  autoSanitizeResponse,
} from './tenant.middleware';

// Validation middleware
export {
  handleValidationErrors,
  validators,
  paginationValidation,
  idParamValidation,
  companyIdValidation,
  validate,
  sanitizeInput,
  validateContentType,
  requireJsonContent,
} from './validation.middleware';

// Error handling middleware
export {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  errorResponses,
  validateErrorMiddleware,
  setupErrorHandlers,
} from './error.middleware';

// Rate limiting middleware
export {
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  registrationRateLimit,
  apiKeyRateLimit,
  uploadRateLimit,
  exportRateLimit,
  webhookRateLimit,
  dynamicRateLimit,
  skipRateLimit,
  conditionalRateLimit,
  cleanupRateLimiter,
} from './rate-limit.middleware';

// Logging middleware
export {
  morganMiddleware,
  requestIdMiddleware,
  logRequestDetails,
  performanceMonitoring,
  auditLog,
  securityLog,
} from './logging.middleware';