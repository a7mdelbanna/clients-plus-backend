import { serviceApiService, type ExpressService as ApiService, type ServiceCategory as ApiCategory } from './api/service.api.service';

// Service Category interfaces
export interface ServiceCategory {
  id?: string;
  companyId: string;
  branchId?: string;
  name: string;
  nameAr?: string;
  useOnlineBookingName?: boolean;
  onlineBookingName?: string;
  servicesCount?: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Service interfaces
export interface Service {
  id?: string;
  companyId: string;
  branchId?: string;
  branchIds?: string[];
  categoryId: string;
  name: string;
  nameAr?: string;
  translations?: {
    en?: string;
    fr?: string;
    [key: string]: string | undefined;
  };
  startingPrice: number;
  priceRange?: {
    min: number;
    max: number;
  };
  duration: {
    hours: number;
    minutes: number;
  };
  type: 'appointment' | 'group-event';
  apiId?: string;
  onlineBooking: {
    enabled: boolean;
    displayName?: string;
    description?: string;
    translations?: {
      en?: string;
      fr?: string;
      [key: string]: string | undefined;
    };
    prepaymentRequired?: boolean;
    membershipRequired?: boolean;
    availabilityPeriod?: number;
  };
  images?: {
    url: string;
    isDefault: boolean;
    uploadedAt: any;
    name?: string;
  }[];
  invoiceName?: string;
  taxSystem?: string;
  vat?: number;
  followUpDays?: number;
  autoDeduction?: boolean;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Service Staff Assignment
export interface ServiceStaff {
  staffId: string;
  price?: number;
  duration?: {
    hours: number;
    minutes: number;
  };
  billOfMaterials?: string;
}

// Service Package
export interface ServicePackage {
  id?: string;
  companyId: string;
  name: string;
  nameAr?: string;
  services: string[];
  totalPrice: number;
  discount?: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// Helper functions
export function getServiceName(service: Service, language: string = 'ar'): string {
  if (language === 'ar') return service.name;
  if (service.translations?.[language]) return service.translations[language]!;
  return service.name;
}

export function getServiceDescription(service: Service, language: string = 'ar'): string | undefined {
  if (language === 'ar') return service.onlineBooking.description;
  if (service.onlineBooking.translations?.[language]) return service.onlineBooking.translations[language];
  return service.onlineBooking.description;
}

// Transform API category to legacy format
function apiCategoryToLegacy(cat: ApiCategory): ServiceCategory {
  return {
    id: cat.id,
    companyId: cat.companyId,
    branchId: cat.branchId,
    name: cat.name,
    nameAr: cat.nameAr,
    servicesCount: cat.servicesCount,
    active: cat.active,
    createdAt: cat.createdAt ? new Date(cat.createdAt) : undefined,
    updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : undefined,
    createdBy: cat.createdBy,
  };
}

// Transform API service to legacy format
function apiServiceToLegacy(apiService: ApiService): Service {
  return {
    id: apiService.id,
    companyId: apiService.companyId,
    branchId: apiService.branchId,
    branchIds: apiService.branchIds,
    categoryId: apiService.categoryId,
    name: apiService.name,
    nameAr: apiService.nameAr,
    translations: apiService.translations ? {
      en: apiService.translations.find((t: any) => t.language === 'en')?.name,
      fr: apiService.translations.find((t: any) => t.language === 'fr')?.name,
    } : undefined,
    startingPrice: apiService.pricing.startingPrice,
    priceRange: apiService.pricing.priceRange,
    duration: apiService.duration,
    type: apiService.type === 'STANDARD' ? 'appointment' : 'group-event',
    apiId: apiService.apiId,
    onlineBooking: {
      enabled: apiService.onlineBooking.enabled,
      displayName: apiService.onlineBooking.displayName,
      description: apiService.onlineBooking.description,
      translations: apiService.onlineBooking.translations ? {
        en: apiService.onlineBooking.translations.find((t: any) => t.language === 'en')?.description,
        fr: apiService.onlineBooking.translations.find((t: any) => t.language === 'fr')?.description,
      } : undefined,
      prepaymentRequired: apiService.onlineBooking.prepaymentRequired,
      membershipRequired: apiService.onlineBooking.membershipRequired,
      availabilityPeriod: apiService.onlineBooking.advanceBookingDays,
    },
    images: apiService.images?.map((img: any) => ({
      url: img.url,
      isDefault: img.isDefault,
      uploadedAt: img.uploadedAt ? new Date(img.uploadedAt) : new Date(),
      name: img.alt,
    })),
    invoiceName: apiService.invoiceName,
    taxSystem: apiService.taxSystem,
    vat: apiService.vat,
    followUpDays: apiService.followUpDays,
    autoDeduction: apiService.autoDeduction,
    active: apiService.active,
    createdAt: apiService.createdAt ? new Date(apiService.createdAt) : undefined,
    updatedAt: apiService.updatedAt ? new Date(apiService.updatedAt) : undefined,
    createdBy: apiService.createdBy,
  };
}

export const serviceService = {
  // Category CRUD
  async createCategory(
    category: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>,
    _userId: string
  ): Promise<string> {
    const apiCategory = await serviceApiService.createCategory({
      name: category.name,
      nameAr: category.nameAr,
      active: category.active,
      order: 0,
      branchId: category.branchId,
    });
    return apiCategory.id;
  },

  async getCategories(companyId: string, branchId?: string): Promise<ServiceCategory[]> {
    const apiCategories = await serviceApiService.getCategories(branchId);
    return apiCategories.map(apiCategoryToLegacy);
  },

  async updateCategory(categoryId: string, updates: Partial<ServiceCategory>): Promise<void> {
    await serviceApiService.updateCategory(categoryId, {
      name: updates.name,
      nameAr: updates.nameAr,
      active: updates.active,
    });
  },

  async deleteCategory(categoryId: string): Promise<void> {
    await serviceApiService.deleteCategory(categoryId);
  },

  // Service CRUD
  async createService(
    service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>,
    _userId: string,
    branchId?: string
  ): Promise<string> {
    const apiService = await serviceApiService.createService({
      name: service.name,
      nameAr: service.nameAr,
      description: service.onlineBooking.description,
      categoryId: service.categoryId,
      type: 'STANDARD',
      status: 'ACTIVE',
      pricing: {
        type: 'FIXED',
        startingPrice: service.startingPrice,
        priceRange: service.priceRange,
      },
      duration: service.duration,
      onlineBooking: {
        enabled: service.onlineBooking.enabled,
        displayName: service.onlineBooking.displayName,
        description: service.onlineBooking.description,
        requiresApproval: service.onlineBooking.prepaymentRequired,
        prepaymentRequired: service.onlineBooking.prepaymentRequired,
        membershipRequired: service.onlineBooking.membershipRequired,
        advanceBookingDays: service.onlineBooking.availabilityPeriod,
      },
      branchIds: branchId ? [branchId] : service.branchIds,
      invoiceName: service.invoiceName,
      taxSystem: service.taxSystem,
      vat: service.vat,
      followUpDays: service.followUpDays,
      autoDeduction: service.autoDeduction,
      apiId: service.apiId,
      active: service.active,
    });
    return apiService.id;
  },

  async getServices(companyId: string, categoryId?: string, branchId?: string): Promise<Service[]> {
    const result = await serviceApiService.getServices({
      categoryId,
      branchId,
      active: true,
      sortBy: 'name',
      sortDirection: 'asc',
    });
    return result.data.map(apiServiceToLegacy);
  },

  async getService(serviceId: string): Promise<Service | null> {
    try {
      const apiService = await serviceApiService.getServiceById(serviceId, true);
      return apiServiceToLegacy(apiService);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async updateService(serviceId: string, updates: Partial<Service>): Promise<void> {
    await serviceApiService.updateService(serviceId, {
      name: updates.name,
      nameAr: updates.nameAr,
      description: updates.onlineBooking?.description,
      categoryId: updates.categoryId,
      pricing: updates.startingPrice !== undefined ? {
        type: 'FIXED',
        startingPrice: updates.startingPrice,
        priceRange: updates.priceRange,
      } : undefined,
      duration: updates.duration,
      onlineBooking: updates.onlineBooking ? {
        enabled: updates.onlineBooking.enabled,
        displayName: updates.onlineBooking.displayName,
        description: updates.onlineBooking.description,
        prepaymentRequired: updates.onlineBooking.prepaymentRequired,
        membershipRequired: updates.onlineBooking.membershipRequired,
        advanceBookingDays: updates.onlineBooking.availabilityPeriod,
      } : undefined,
      branchIds: updates.branchIds,
      invoiceName: updates.invoiceName,
      taxSystem: updates.taxSystem,
      vat: updates.vat,
      followUpDays: updates.followUpDays,
      autoDeduction: updates.autoDeduction,
      apiId: updates.apiId,
      active: updates.active,
    });
  },

  async deleteService(serviceId: string): Promise<void> {
    await serviceApiService.deleteService(serviceId);
  },

  // Service Staff Management
  async assignStaffToService(serviceId: string, staff: ServiceStaff[]): Promise<void> {
    await serviceApiService.assignStaffToService(serviceId, staff.map(s => ({
      staffId: s.staffId,
      price: s.price,
      duration: s.duration,
      billOfMaterials: s.billOfMaterials,
    })));
  },

  async getServiceStaff(serviceId: string): Promise<ServiceStaff[]> {
    const apiStaff = await serviceApiService.getServiceStaff(serviceId);
    return apiStaff.map(s => ({
      staffId: s.staffId,
      price: s.price,
      duration: s.duration,
      billOfMaterials: s.billOfMaterials,
    }));
  },

  // Real-time subscriptions replaced with polling
  subscribeToCategories(
    companyId: string,
    callback: (categories: ServiceCategory[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Initial fetch
    this.getCategories(companyId)
      .then(callback)
      .catch((error) => {
        console.error('Error fetching categories:', error);
        if (errorCallback) errorCallback(error);
      });

    const interval = setInterval(() => {
      this.getCategories(companyId)
        .then(callback)
        .catch((error) => {
          console.error('Error polling categories:', error);
          if (errorCallback) errorCallback(error);
        });
    }, 30000);

    return () => clearInterval(interval);
  },

  subscribeToServices(
    companyId: string,
    callback: (services: Service[]) => void,
    categoryId?: string,
    errorCallback?: (error: Error) => void,
    branchId?: string
  ): () => void {
    // Initial fetch
    this.getServices(companyId, categoryId, branchId)
      .then(callback)
      .catch((error) => {
        console.error('Error fetching services:', error);
        if (errorCallback) errorCallback(error);
      });

    const interval = setInterval(() => {
      this.getServices(companyId, categoryId, branchId)
        .then(callback)
        .catch((error) => {
          console.error('Error polling services:', error);
          if (errorCallback) errorCallback(error);
        });
    }, 15000);

    return () => clearInterval(interval);
  },
};
