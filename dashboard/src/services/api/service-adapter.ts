/**
 * Service Adapter Factory
 * Provides a unified interface to switch between Firebase and Express APIs
 * Handles Wave 1 and Wave 2 API migrations with feature flags
 */

import { serviceAPI } from './service.api';
import { staffAPI } from './staff.api';
import { branchAPI } from './branch.api';
import { productAPI } from './product.api';
import { clientApiAdapter } from './adapter';

// Import Firebase services (existing)
// These would be your existing Firebase services
type FirebaseServiceService = any; // Replace with actual Firebase service type
type FirebaseStaffService = any;   // Replace with actual Firebase staff type
type FirebaseBranchService = any;  // Replace with actual Firebase branch type
type FirebaseProductService = any; // Replace with actual Firebase product type

// =========================== FEATURE FLAGS ===========================

export interface ServiceMigrationFlags {
  // Wave 1 APIs
  USE_EXPRESS_SERVICES: boolean;
  USE_EXPRESS_STAFF: boolean;
  USE_EXPRESS_BRANCHES: boolean;
  USE_EXPRESS_PRODUCTS: boolean;
  USE_EXPRESS_CLIENTS: boolean;
  
  // Wave 2 APIs (when available)
  USE_EXPRESS_APPOINTMENTS: boolean;
  USE_EXPRESS_INVOICES: boolean;
  USE_WEBSOCKET: boolean;
  
  // Global switches
  FORCE_EXPRESS_MODE: boolean;
  ENABLE_FALLBACK: boolean;
}

// Default configuration - can be overridden by environment variables
const DEFAULT_FLAGS: ServiceMigrationFlags = {
  USE_EXPRESS_SERVICES: import.meta.env.VITE_USE_EXPRESS_SERVICES === 'true',
  USE_EXPRESS_STAFF: import.meta.env.VITE_USE_EXPRESS_STAFF === 'true',
  USE_EXPRESS_BRANCHES: import.meta.env.VITE_USE_EXPRESS_BRANCHES === 'true',
  USE_EXPRESS_PRODUCTS: import.meta.env.VITE_USE_EXPRESS_PRODUCTS === 'true',
  USE_EXPRESS_CLIENTS: import.meta.env.VITE_USE_EXPRESS_CLIENTS === 'true',
  USE_EXPRESS_APPOINTMENTS: import.meta.env.VITE_USE_EXPRESS_APPOINTMENTS === 'true',
  USE_EXPRESS_INVOICES: import.meta.env.VITE_USE_EXPRESS_INVOICES === 'true',
  USE_WEBSOCKET: import.meta.env.VITE_USE_WEBSOCKET === 'true',
  FORCE_EXPRESS_MODE: import.meta.env.VITE_FORCE_EXPRESS_MODE === 'true',
  ENABLE_FALLBACK: import.meta.env.VITE_ENABLE_FALLBACK !== 'false',
};

// =========================== SERVICE INTERFACES ===========================

export interface IServiceAPI {
  getServices: typeof serviceAPI.getServices;
  getServiceById: typeof serviceAPI.getServiceById;
  createService: typeof serviceAPI.createService;
  updateService: typeof serviceAPI.updateService;
  deleteService: typeof serviceAPI.deleteService;
  getCategories: typeof serviceAPI.getCategories;
  createCategory: typeof serviceAPI.createCategory;
  updateCategory: typeof serviceAPI.updateCategory;
  deleteCategory: typeof serviceAPI.deleteCategory;
  reorderServices: typeof serviceAPI.reorderServices;
  getServicesByStaff: typeof serviceAPI.getServicesByStaff;
  getServicesByCategory: typeof serviceAPI.getServicesByCategory;
  getOnlineBookableServices: typeof serviceAPI.getOnlineBookableServices;
  assignStaffToService: typeof serviceAPI.assignStaffToService;
  getServiceStaff: typeof serviceAPI.getServiceStaff;
}

export interface IStaffAPI {
  getStaff: typeof staffAPI.getStaff;
  getStaffById: typeof staffAPI.getStaffById;
  createStaff: typeof staffAPI.createStaff;
  updateStaff: typeof staffAPI.updateStaff;
  deleteStaff: typeof staffAPI.deleteStaff;
  getStaffByService: typeof staffAPI.getStaffByService;
  getStaffByBranch: typeof staffAPI.getStaffByBranch;
  assignService: typeof staffAPI.assignService;
  assignBranch: typeof staffAPI.assignBranch;
  getSchedule: typeof staffAPI.getSchedule;
  updateSchedule: typeof staffAPI.updateSchedule;
  checkAvailability: typeof staffAPI.checkAvailability;
  requestTimeOff: typeof staffAPI.requestTimeOff;
  getTimeOff: typeof staffAPI.getTimeOff;
}

export interface IBranchAPI {
  getBranches: typeof branchAPI.getBranches;
  getBranchById: typeof branchAPI.getBranchById;
  createBranch: typeof branchAPI.createBranch;
  updateBranch: typeof branchAPI.updateBranch;
  deleteBranch: typeof branchAPI.deleteBranch;
  setDefaultBranch: typeof branchAPI.setDefaultBranch;
  getOperatingHours: typeof branchAPI.getOperatingHours;
  updateOperatingHours: typeof branchAPI.updateOperatingHours;
  assignStaff: typeof branchAPI.assignStaff;
  assignServices: typeof branchAPI.assignServices;
  assignResources: typeof branchAPI.assignResources;
}

export interface IProductAPI {
  getProducts: typeof productAPI.getProducts;
  getProductById: typeof productAPI.getProductById;
  createProduct: typeof productAPI.createProduct;
  updateProduct: typeof productAPI.updateProduct;
  deleteProduct: typeof productAPI.deleteProduct;
  getCategories: typeof productAPI.getCategories;
  createCategory: typeof productAPI.createCategory;
  updateCategory: typeof productAPI.updateCategory;
  deleteCategory: typeof productAPI.deleteCategory;
  getInventory: typeof productAPI.getInventory;
  adjustStock: typeof productAPI.adjustStock;
  transferStock: typeof productAPI.transferStock;
  getLowStockAlerts: typeof productAPI.getLowStockAlerts;
}

export interface IClientAPI {
  createClient: typeof clientApiAdapter.createClient;
  getClient: typeof clientApiAdapter.getClient;
  updateClient: typeof clientApiAdapter.updateClient;
  deleteClient: typeof clientApiAdapter.deleteClient;
  getClients: typeof clientApiAdapter.getClients;
  getAllClients: typeof clientApiAdapter.getAllClients;
  getClientSuggestions: typeof clientApiAdapter.getClientSuggestions;
  checkForDuplicates: typeof clientApiAdapter.checkForDuplicates;
  updateClientStats: typeof clientApiAdapter.updateClientStats;
  getClientContacts: typeof clientApiAdapter.getClientContacts;
  addClientContact: typeof clientApiAdapter.addClientContact;
  getClientBalanceSummary: typeof clientApiAdapter.getClientBalanceSummary;
}

// =========================== ADAPTER FACTORY CLASS ===========================

export class ServiceAdapterFactory {
  private flags: ServiceMigrationFlags;
  private serviceCache: Map<string, any> = new Map();

  constructor(customFlags?: Partial<ServiceMigrationFlags>) {
    this.flags = { ...DEFAULT_FLAGS, ...customFlags };
    console.log('Service Adapter Factory initialized with flags:', this.flags);
  }

  /**
   * Update feature flags at runtime
   */
  updateFlags(newFlags: Partial<ServiceMigrationFlags>): void {
    this.flags = { ...this.flags, ...newFlags };
    this.serviceCache.clear(); // Clear cache to force recreation with new flags
    console.log('Service flags updated:', this.flags);
  }

  /**
   * Get current feature flags
   */
  getFlags(): ServiceMigrationFlags {
    return { ...this.flags };
  }

  // =========================== SERVICE ADAPTERS ===========================

  /**
   * Get Service API implementation
   */
  getServiceAPI(): IServiceAPI {
    const cacheKey = 'service-api';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let implementation: IServiceAPI;

    if (this.flags.FORCE_EXPRESS_MODE || this.flags.USE_EXPRESS_SERVICES) {
      console.log('Using Express Service API');
      implementation = serviceAPI;
    } else {
      console.log('Using Firebase Service API (fallback)');
      // TODO: Implement Firebase service adapter
      implementation = this.createFirebaseServiceAdapter();
    }

    this.serviceCache.set(cacheKey, implementation);
    return implementation;
  }

  /**
   * Get Staff API implementation
   */
  getStaffAPI(): IStaffAPI {
    const cacheKey = 'staff-api';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let implementation: IStaffAPI;

    if (this.flags.FORCE_EXPRESS_MODE || this.flags.USE_EXPRESS_STAFF) {
      console.log('Using Express Staff API');
      implementation = staffAPI;
    } else {
      console.log('Using Firebase Staff API (fallback)');
      // TODO: Implement Firebase staff adapter
      implementation = this.createFirebaseStaffAdapter();
    }

    this.serviceCache.set(cacheKey, implementation);
    return implementation;
  }

  /**
   * Get Branch API implementation
   */
  getBranchAPI(): IBranchAPI {
    const cacheKey = 'branch-api';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let implementation: IBranchAPI;

    if (this.flags.FORCE_EXPRESS_MODE || this.flags.USE_EXPRESS_BRANCHES) {
      console.log('Using Express Branch API');
      implementation = branchAPI;
    } else {
      console.log('Using Firebase Branch API (fallback)');
      // TODO: Implement Firebase branch adapter
      implementation = this.createFirebaseBranchAdapter();
    }

    this.serviceCache.set(cacheKey, implementation);
    return implementation;
  }

  /**
   * Get Product API implementation
   */
  getProductAPI(): IProductAPI {
    const cacheKey = 'product-api';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let implementation: IProductAPI;

    if (this.flags.FORCE_EXPRESS_MODE || this.flags.USE_EXPRESS_PRODUCTS) {
      console.log('Using Express Product API');
      implementation = productAPI;
    } else {
      console.log('Using Firebase Product API (fallback)');
      // TODO: Implement Firebase product adapter
      implementation = this.createFirebaseProductAdapter();
    }

    this.serviceCache.set(cacheKey, implementation);
    return implementation;
  }

  /**
   * Get Client API implementation
   */
  getClientAPI(): IClientAPI {
    const cacheKey = 'client-api';
    
    if (this.serviceCache.has(cacheKey)) {
      return this.serviceCache.get(cacheKey);
    }

    let implementation: IClientAPI;

    if (this.flags.FORCE_EXPRESS_MODE || this.flags.USE_EXPRESS_CLIENTS) {
      console.log('Using Express Client API (via adapter)');
      implementation = clientApiAdapter;
    } else {
      console.log('Using Firebase Client API (fallback)');
      // TODO: Implement direct Firebase client adapter
      implementation = this.createFirebaseClientAdapter();
    }

    this.serviceCache.set(cacheKey, implementation);
    return implementation;
  }

  // =========================== FIREBASE ADAPTER CREATORS ===========================
  // These methods create Firebase-compatible interfaces when needed

  private createFirebaseServiceAdapter(): IServiceAPI {
    // TODO: Implement Firebase service adapter that matches IServiceAPI interface
    console.warn('Firebase Service adapter not implemented yet, using Express API as fallback');
    return serviceAPI;
  }

  private createFirebaseStaffAdapter(): IStaffAPI {
    // TODO: Implement Firebase staff adapter that matches IStaffAPI interface
    console.warn('Firebase Staff adapter not implemented yet, using Express API as fallback');
    return staffAPI;
  }

  private createFirebaseBranchAdapter(): IBranchAPI {
    // TODO: Implement Firebase branch adapter that matches IBranchAPI interface
    console.warn('Firebase Branch adapter not implemented yet, using Express API as fallback');
    return branchAPI;
  }

  private createFirebaseProductAdapter(): IProductAPI {
    // TODO: Implement Firebase product adapter that matches IProductAPI interface
    console.warn('Firebase Product adapter not implemented yet, using Express API as fallback');
    return productAPI;
  }

  private createFirebaseClientAdapter(): IClientAPI {
    // TODO: Implement Firebase client adapter that matches IClientAPI interface
    console.warn('Firebase Client adapter not implemented yet, using Express API as fallback');
    return clientApiAdapter;
  }

  // =========================== UTILITY METHODS ===========================

  /**
   * Health check all configured APIs
   */
  async healthCheck(): Promise<{
    services: { [key: string]: { healthy: boolean; error?: string } }
  }> {
    const results: { [key: string]: { healthy: boolean; error?: string } } = {};

    // Check each API if it's enabled
    if (this.flags.USE_EXPRESS_SERVICES) {
      try {
        const healthy = await serviceAPI.healthCheck();
        results.services = { healthy };
      } catch (error: any) {
        results.services = { healthy: false, error: error.message };
      }
    }

    if (this.flags.USE_EXPRESS_STAFF) {
      try {
        // Staff API doesn't have health check, so we'll do a simple stats call
        await staffAPI.getStaffStats();
        results.staff = { healthy: true };
      } catch (error: any) {
        results.staff = { healthy: false, error: error.message };
      }
    }

    // Add more health checks as needed

    return { services: results };
  }

  /**
   * Get adapter status information
   */
  getStatus() {
    return {
      flags: this.flags,
      cacheSize: this.serviceCache.size,
      cachedServices: Array.from(this.serviceCache.keys()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all cached service instances
   */
  clearCache(): void {
    this.serviceCache.clear();
    console.log('Service adapter cache cleared');
  }

  /**
   * Enable gradual migration by service type
   */
  enableService(serviceType: keyof ServiceMigrationFlags, enabled = true): void {
    this.flags[serviceType] = enabled;
    
    // Clear related cache entries
    const relatedCacheKeys = {
      'USE_EXPRESS_SERVICES': 'service-api',
      'USE_EXPRESS_STAFF': 'staff-api',
      'USE_EXPRESS_BRANCHES': 'branch-api',
      'USE_EXPRESS_PRODUCTS': 'product-api',
      'USE_EXPRESS_CLIENTS': 'client-api',
    };

    const cacheKey = relatedCacheKeys[serviceType as keyof typeof relatedCacheKeys];
    if (cacheKey && this.serviceCache.has(cacheKey)) {
      this.serviceCache.delete(cacheKey);
    }

    console.log(`${serviceType} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if WebSocket features are available
   */
  isWebSocketEnabled(): boolean {
    return this.flags.USE_WEBSOCKET;
  }

  /**
   * Check if fallback to Firebase is enabled
   */
  isFallbackEnabled(): boolean {
    return this.flags.ENABLE_FALLBACK;
  }
}

// =========================== SINGLETON INSTANCE ===========================

// Create singleton instance
const serviceAdapterFactory = new ServiceAdapterFactory();

// Expose individual service getters for backward compatibility
export const getServiceAPI = () => serviceAdapterFactory.getServiceAPI();
export const getStaffAPI = () => serviceAdapterFactory.getStaffAPI();
export const getBranchAPI = () => serviceAdapterFactory.getBranchAPI();
export const getProductAPI = () => serviceAdapterFactory.getProductAPI();
export const getClientAPI = () => serviceAdapterFactory.getClientAPI();

// Export the factory instance
export { serviceAdapterFactory };

// Export default for easy import
export default serviceAdapterFactory;