import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';

// Pricing plan configuration
export interface PricingPlan {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  currency: 'EGP';
  features: string[];
  featuresAr?: string[];
  limits: {
    branches: number;
    staff: number;
    appointments: number;
    sms: number;
    storage?: number;
  };
  popular?: boolean;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// Pricing override for specific companies
export interface PricingOverride {
  id?: string;
  companyId: string;
  companyName: string;
  planId: string;
  originalPrice: number;
  customPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  reason: string;
  validFrom: string;
  validUntil?: string;
  addons?: {
    whiteLabel?: {
      enabled: boolean;
      customPrice?: number;
    };
    mobileApp?: {
      enabled: boolean;
      customPrice?: number;
    };
  };
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

// Add-on configuration
export interface AddOn {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  type: 'whiteLabel' | 'mobileApp' | 'custom';
  pricing: {
    oneTime?: number;
    monthly?: number;
    setup?: number;
  };
  features: string[];
  featuresAr?: string[];
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// Company subscription info
export interface CompanySubscription {
  companyId: string;
  planId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended';
  pricing: {
    amount: number;
    currency: 'EGP';
    isLegacy?: boolean;
    legacyStartDate?: string;
  };
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  addons?: Array<{
    id: string;
    status: 'active' | 'pending' | 'cancelled';
    activatedAt: string;
  }>;
  override?: PricingOverride;
  createdAt?: string;
  updatedAt?: string;
}

class PricingService {
  private readonly endpoint = '/pricing';

  // Get all pricing plans
  async getPricingPlans(activeOnly = true): Promise<PricingPlan[]> {
    try {
      const params: any = {};
      if (activeOnly) params.activeOnly = true;
      const response = await apiClient.get<ApiResponse<PricingPlan[]>>(`${this.endpoint}/plans`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting pricing plans:', error);
      throw error;
    }
  }

  // Get a specific pricing plan
  async getPricingPlan(planId: string): Promise<PricingPlan | null> {
    try {
      const response = await apiClient.get<ApiResponse<PricingPlan>>(`${this.endpoint}/plans/${planId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting pricing plan:', error);
      throw error;
    }
  }

  // Create or update pricing plan (superadmin only)
  async savePricingPlan(plan: Partial<PricingPlan>): Promise<string> {
    try {
      if (!plan.id) {
        const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.endpoint}/plans`, plan);
        return response.data.data!.id;
      } else {
        const { id, ...updateData } = plan;
        await apiClient.put<ApiResponse<void>>(`${this.endpoint}/plans/${id}`, updateData);
        return id;
      }
    } catch (error: any) {
      console.error('Error saving pricing plan:', error);
      throw error;
    }
  }

  // Get all add-ons
  async getAddOns(activeOnly = true): Promise<AddOn[]> {
    try {
      const params: any = {};
      if (activeOnly) params.activeOnly = true;
      const response = await apiClient.get<ApiResponse<AddOn[]>>(`${this.endpoint}/addons`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting add-ons:', error);
      throw error;
    }
  }

  // Get pricing overrides for a company
  async getCompanyPricingOverride(companyId: string): Promise<PricingOverride | null> {
    try {
      const response = await apiClient.get<ApiResponse<PricingOverride>>(
        `${this.endpoint}/overrides/${companyId}`
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting company pricing override:', error);
      throw error;
    }
  }

  // Create or update pricing override (superadmin only)
  async savePricingOverride(override: Partial<PricingOverride>): Promise<string> {
    try {
      if (!override.id) {
        const response = await apiClient.post<ApiResponse<{ id: string }>>(
          `${this.endpoint}/overrides`,
          override
        );
        return response.data.data!.id;
      } else {
        const { id, ...updateData } = override;
        await apiClient.put<ApiResponse<void>>(`${this.endpoint}/overrides/${id}`, updateData);
        return id;
      }
    } catch (error: any) {
      console.error('Error saving pricing override:', error);
      throw error;
    }
  }

  // Get company subscription details
  async getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
    try {
      const response = await apiClient.get<ApiResponse<CompanySubscription>>(
        `${this.endpoint}/subscriptions/${companyId}`
      );
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Error getting company subscription:', error);
      throw error;
    }
  }

  // Calculate effective price for a company
  async calculateEffectivePrice(companyId: string, planId: string): Promise<{
    basePrice: number;
    effectivePrice: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    isLegacy: boolean;
  }> {
    try {
      const response = await apiClient.get<ApiResponse<{
        basePrice: number;
        effectivePrice: number;
        discount?: number;
        discountType?: 'percentage' | 'fixed';
        isLegacy: boolean;
      }>>(`${this.endpoint}/calculate-price`, {
        params: { companyId, planId },
      });
      return response.data.data || { basePrice: 0, effectivePrice: 0, isLegacy: false };
    } catch (error) {
      console.error('Error calculating effective price:', error);
      throw error;
    }
  }

  // Subscribe to pricing plan changes (polling)
  subscribeToPricingPlans(
    callback: (plans: PricingPlan[]) => void,
    activeOnly = true
  ): () => void {
    this.getPricingPlans(activeOnly)
      .then(callback)
      .catch(error => console.error('Error in pricing subscription:', error));

    const interval = setInterval(() => {
      this.getPricingPlans(activeOnly)
        .then(callback)
        .catch(error => console.error('Error in pricing subscription:', error));
    }, 60000); // 60s for pricing - rarely changes

    return () => clearInterval(interval);
  }

  // Get pricing data for public API (landing page)
  async getPublicPricingData(): Promise<{
    plans: PricingPlan[];
    addons: AddOn[];
    lastUpdated: Date;
  }> {
    try {
      const [plans, addons] = await Promise.all([
        this.getPricingPlans(true),
        this.getAddOns(true),
      ]);

      return {
        plans,
        addons,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error getting public pricing data:', error);
      throw error;
    }
  }
}

export const pricingService = new PricingService();
