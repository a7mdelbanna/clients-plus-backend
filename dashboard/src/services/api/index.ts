/**
 * API Services Index
 * Centralized exports for all API services, adapters, and utilities
 */

// Core API configuration and utilities
export {
  default as apiClient,
  TokenManager,
  tokenUtils,
  checkApiHealth,
  API_CONFIG,
  TOKEN_KEYS,
  createAxiosInstance,
} from '../../config/api';

// Authentication service
export { default as authApiService } from './auth.api';
export type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from './auth.api';

// Client API service
export { default as clientApiService } from './client.api';
export type {
  ExpressClient,
  ClientPhone,
  ClientEmail,
  ClientAddress,
  ClientsResponse,
  ClientStatsResponse,
  BulkUpdateRequest,
  ExpressPaginationOptions,
  ExpressClientsFilter,
} from './client.api';

// Adapter for Firebase compatibility
export { default as clientApiAdapter } from './adapter';

// Wave 1 & Wave 2 API Services
export { serviceAPI } from './service.api';
export { staffAPI } from './staff.api';
export { branchAPI } from './branch.api';
export { productAPI } from './product.api';

// Wave 3 API Services - Core Business Operations
export { appointmentAPI } from './appointment.api';
export { invoiceAPI } from './invoice.api';
export { analyticsAPI } from './analytics.api';
export { notificationAPI } from './notification.api';

// Setup API service
export { default as setupApiService } from './setup.api.service';

// Branches API service
export { default as branchesApiService } from './branches.api.service';
export type { Branch as BranchesApiBranch } from './branches.api.service';
export type {
  SetupStatus,
  SetupProgress,
  BusinessInfo,
  BusinessHours,
  Branch,
  TeamMember,
  WorkSchedule,
  TeamInfo,
  ThemeConfig,
  SetupData,
  BusinessType,
  AvailableTheme,
} from './setup.api.service';

// Export types for the new API services
export type {
  // Appointment API types
  ExpressAppointment,
  RecurringPattern,
  AppointmentFilters,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  AvailableSlot,
  AvailabilityRequest,
  BulkAvailabilityRequest,
  PublicBookingRequest,
  AppointmentStats,
  PaginatedAppointmentResponse,
} from './appointment.api';

export type {
  // Invoice API types
  ExpressInvoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceRefund,
  InvoiceFilters,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  ProcessRefundDto,
  InvoiceSummary,
  InvoiceAnalytics,
  PaginatedInvoiceResponse,
  PdfGenerationOptions,
} from './invoice.api';

export type {
  // Analytics API types
  AnalyticsDateRange,
  AnalyticsQuery,
  AnalyticsOverviewQuery,
  RevenueAnalytics,
  AppointmentAnalytics,
  ClientAnalytics,
  StaffPerformance,
  ServiceAnalytics,
  AnalyticsSummary,
  AnalyticsOverview,
  DashboardMetrics,
  KPIMetrics,
  ExportOptions as AnalyticsExportOptions,
} from './analytics.api';

export type {
  // Notification API types
  NotificationRecipient,
  NotificationTemplate,
  NotificationMessage,
  BulkNotificationRequest,
  ScheduledNotification,
  NotificationHistory,
  NotificationFilters,
  QueueStats,
  WhatsAppStatus,
  NotificationSettings,
  PaginatedNotificationResponse,
} from './notification.api';

// Comprehensive Service Adapter Factory
export {
  serviceAdapterFactory,
  getServiceAPI,
  getStaffAPI,
  getBranchAPI,
  getProductAPI,
  getClientAPI,
  ServiceAdapterFactory,
} from './service-adapter';

export type {
  ServiceMigrationFlags,
  IServiceAPI,
  IStaffAPI,
  IBranchAPI,
  IProductAPI,
  IClientAPI,
} from './service-adapter';

// Type exports for common API responses
export type {
  ApiResponse,
  ApiError,
} from '../../config/api';

// Re-export Firebase types for backward compatibility
export type {
  Client,
  ClientsFilter,
  PaginationOptions,
  DuplicateCheckResult,
  ClientContact,
  ClientBalanceSummary,
  BulkOperationResult,
  SavedFilter,
  ImportPreview,
  ImportOptions,
  ImportResult,
  ExportOptions,
  ClientPhone as FirebaseClientPhone,
  ClientEmail as FirebaseClientEmail,
  ClientAddress as FirebaseClientAddress,
  ClientPreferences,
  ClientMedical,
  ClientMarketing,
  EmergencyContact,
  ClientSocialMedia,
  ClientVisit,
  ClientTransaction,
  ClientPackage,
  ClientMembership,
  ClientCommunication,
  ClientActivity,
  ClientCategoryAssignment,
  DuplicateMatch,
  DuplicateCheckResult as FirebaseDuplicateCheckResult,
  ImportMapping,
  ImportValidationError,
  BulkOperation,
} from '../client.service';

/**
 * Service Factory
 * Provides a way to switch between Firebase and Express API services
 */
export class ServiceFactory {
  private static useExpressAPI = true; // Toggle to switch between services

  /**
   * Toggle between Firebase and Express API
   */
  static setApiMode(useExpress: boolean): void {
    this.useExpressAPI = useExpress;
    console.log(`API mode switched to: ${useExpress ? 'Express' : 'Firebase'}`);
  }

  /**
   * Get the current API mode
   */
  static getApiMode(): 'express' | 'firebase' {
    return this.useExpressAPI ? 'express' : 'firebase';
  }

  /**
   * Get the appropriate client service based on current mode
   */
  static getClientService() {
    if (this.useExpressAPI) {
      return clientApiAdapter;
    } else {
      // Import Firebase service dynamically to avoid bundle size when not needed
      return import('../client.service').then(module => module.clientService);
    }
  }

  /**
   * Get the appropriate auth service based on current mode
   */
  static getAuthService() {
    if (this.useExpressAPI) {
      return authApiService;
    } else {
      // For Firebase, we'd return the Firebase auth context/service
      throw new Error('Firebase auth service not implemented in this adapter');
    }
  }
}

/**
 * Migration Helper
 * Provides utilities for migrating from Firebase to Express API
 */
export class MigrationHelper {
  /**
   * Test API connectivity and service health
   */
  static async testConnectivity(): Promise<{
    apiHealth: boolean;
    authEndpoint: boolean;
    clientEndpoint: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let apiHealth = false;
    let authEndpoint = false;
    let clientEndpoint = false;

    try {
      // Test API health
      apiHealth = await checkApiHealth();
      if (!apiHealth) {
        errors.push('API health check failed');
      }
    } catch (error) {
      errors.push(`API health check error: ${error}`);
    }

    try {
      // Test auth endpoint (should return 401 without token)
      await authApiService.getCurrentUser();
      authEndpoint = true;
    } catch (error: any) {
      // 401 is expected without valid token
      if (error.message?.includes('401') || error.message?.includes('token')) {
        authEndpoint = true;
      } else {
        errors.push(`Auth endpoint error: ${error.message}`);
      }
    }

    try {
      // Test client endpoint (should return 401 without token)
      await clientApiService.healthCheck();
      clientEndpoint = true;
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('token')) {
        clientEndpoint = true;
      } else {
        errors.push(`Client endpoint error: ${error.message}`);
      }
    }

    return {
      apiHealth,
      authEndpoint,
      clientEndpoint,
      errors,
    };
  }

  /**
   * Compare Firebase and Express API responses for data integrity
   */
  static async compareClientData(clientId: string): Promise<{
    firebaseClient: Client | null;
    expressClient: Client | null;
    differences: string[];
  }> {
    const differences: string[] = [];
    let firebaseClient: Client | null = null;
    let expressClient: Client | null = null;

    try {
      // Get from Firebase
      const { clientService } = await import('../client.service');
      firebaseClient = await clientService.getClient(clientId);
    } catch (error) {
      differences.push(`Firebase fetch error: ${error}`);
    }

    try {
      // Get from Express API
      expressClient = await clientApiAdapter.getClient(clientId);
    } catch (error) {
      differences.push(`Express API fetch error: ${error}`);
    }

    // Compare data if both exist
    if (firebaseClient && expressClient) {
      const compareFields = ['firstName', 'lastName', 'email', 'phone', 'status'];
      
      for (const field of compareFields) {
        const fbValue = firebaseClient[field as keyof Client];
        const expValue = expressClient[field as keyof Client];
        
        if (fbValue !== expValue) {
          differences.push(`Field '${field}': Firebase='${fbValue}', Express='${expValue}'`);
        }
      }
    }

    return {
      firebaseClient,
      expressClient,
      differences,
    };
  }

  /**
   * Validate Express API data format
   */
  static validateExpressClientData(client: ExpressClient): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!client.id) errors.push('Missing client ID');
    if (!client.firstName) errors.push('Missing first name');
    if (!client.companyId) errors.push('Missing company ID');
    if (!client.status) errors.push('Missing status');
    
    // Validate status enum
    if (client.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(client.status)) {
      errors.push(`Invalid status: ${client.status}`);
    }

    // Validate gender enum if present
    if (client.gender && !['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(client.gender)) {
      errors.push(`Invalid gender: ${client.gender}`);
    }

    // Validate email format if present
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push(`Invalid email format: ${client.email}`);
    }

    // Validate date formats
    if (client.dateOfBirth && isNaN(Date.parse(client.dateOfBirth))) {
      errors.push(`Invalid date format for dateOfBirth: ${client.dateOfBirth}`);
    }

    if (client.createdAt && isNaN(Date.parse(client.createdAt))) {
      errors.push(`Invalid date format for createdAt: ${client.createdAt}`);
    }

    if (client.updatedAt && isNaN(Date.parse(client.updatedAt))) {
      errors.push(`Invalid date format for updatedAt: ${client.updatedAt}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Configuration for API services
 */
export const API_SERVICE_CONFIG = {
  // Default to Express API for new implementations
  DEFAULT_MODE: 'express' as const,
  
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Polling interval for real-time updates (since Express doesn't support WebSocket)
  POLLING_INTERVAL: 30000, // 30 seconds
  
  // Cache configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  // Enable/disable features
  FEATURES: {
    AUTO_TOKEN_REFRESH: true,
    REQUEST_LOGGING: import.meta.env.DEV,
    OFFLINE_SUPPORT: false, // To be implemented
    OPTIMISTIC_UPDATES: true,
  },
} as const;

// Initialize service factory with default mode
ServiceFactory.setApiMode(API_SERVICE_CONFIG.DEFAULT_MODE === 'express');

// Default exports for easy imports
export default {
  authApi: authApiService,
  clientApi: clientApiService,
  clientAdapter: clientApiAdapter,
  appointmentApi: appointmentAPI,
  invoiceApi: invoiceAPI,
  analyticsApi: analyticsAPI,
  notificationApi: notificationAPI,
  setupApi: setupApiService,
  ServiceFactory,
  MigrationHelper,
  API_SERVICE_CONFIG,
};