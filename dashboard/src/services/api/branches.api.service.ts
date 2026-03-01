import { branchAPI, type Branch as BackendBranch, BranchStatus, BranchType } from './branch.api';

// Context-compatible Branch interface (matches the existing context interface)
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  type?: 'main' | 'secondary';
  status?: 'active' | 'inactive';
  isMain?: boolean; // For backward compatibility
  active?: boolean; // For backward compatibility
  createdAt?: any;
  businessName?: string; // Business name from company document
}

/**
 * Simplified branches API service for BranchContext compatibility
 * Wraps the existing BranchAPI and provides simplified interface
 */
export class BranchesApiService {
  
  /**
   * Get all branches for a company
   * Returns simplified Branch interface compatible with existing context
   */
  async getBranches(companyId: string): Promise<Branch[]> {
    if (!companyId) {
      console.warn('[BranchesApiService] No company ID provided');
      return [];
    }

    try {
      console.log('[BranchesApiService] Fetching branches for company:', companyId);
      
      const response = await branchAPI.getBranches(companyId, {
        includeInactive: false, // Only get active branches
        limit: 100, // Get all branches (during trial max 2)
      });

      console.log('[BranchesApiService] Raw backend response:', response.data.length, 'branches');

      // Transform backend branches to context-compatible format
      const branches = response.data.map((backendBranch: BackendBranch): Branch => {
        const isMain = backendBranch.type === BranchType.MAIN || backendBranch.isDefault;
        const isActive = backendBranch.status === BranchStatus.ACTIVE;

        return {
          id: backendBranch.id,
          name: backendBranch.name,
          address: this.formatAddress(backendBranch.address),
          phone: backendBranch.contact?.phone || backendBranch.contact?.mobile || '',
          type: isMain ? 'main' : 'secondary',
          status: isActive ? 'active' : 'inactive',
          isMain: isMain,
          active: isActive,
          createdAt: backendBranch.createdAt,
          businessName: undefined, // We'll get this from company context if needed
        };
      });

      // Sort branches so main branch is first
      branches.sort((a, b) => {
        if (a.isMain || a.type === 'main') return -1;
        if (b.isMain || b.type === 'main') return 1;
        return 0;
      });

      console.log('[BranchesApiService] Transformed branches:', branches.map(b => ({ id: b.id, name: b.name, type: b.type })));
      return branches;
    } catch (error: any) {
      console.error('[BranchesApiService] Error fetching branches:', {
        companyId,
        error: error.message || error,
        status: error.status || error.response?.status
      });
      // Return empty array instead of throwing to prevent context from failing
      return [];
    }
  }

  /**
   * Get a single branch by ID
   */
  async getBranch(companyId: string, branchId: string): Promise<Branch | null> {
    try {
      const backendBranch = await branchAPI.getBranchById(companyId, branchId);
      
      const isMain = backendBranch.type === BranchType.MAIN || backendBranch.isDefault;
      const isActive = backendBranch.status === BranchStatus.ACTIVE;

      return {
        id: backendBranch.id,
        name: backendBranch.name,
        address: this.formatAddress(backendBranch.address),
        phone: backendBranch.contact?.phone || backendBranch.contact?.mobile || '',
        type: isMain ? 'main' : 'secondary',
        status: isActive ? 'active' : 'inactive',
        isMain: isMain,
        active: isActive,
        createdAt: backendBranch.createdAt,
        businessName: undefined,
      };
    } catch (error) {
      console.error('Error fetching branch:', error);
      return null;
    }
  }

  /**
   * Create a new branch (simplified interface)
   */
  async createBranch(companyId: string, data: {
    name: string;
    address: string;
    phone?: string;
    type?: 'main' | 'secondary';
  }): Promise<Branch | null> {
    try {
      const backendBranch = await branchAPI.createBranch(companyId, {
        name: data.name,
        type: data.type === 'main' ? BranchType.MAIN : BranchType.SECONDARY,
        address: {
          street: data.address,
          city: '', // Will need to be parsed or provided separately
          country: '', // Will need to be provided
        },
        contact: {
          phone: data.phone,
        },
      });

      const isMain = backendBranch.type === BranchType.MAIN || backendBranch.isDefault;
      const isActive = backendBranch.status === BranchStatus.ACTIVE;

      return {
        id: backendBranch.id,
        name: backendBranch.name,
        address: this.formatAddress(backendBranch.address),
        phone: backendBranch.contact?.phone || backendBranch.contact?.mobile || '',
        type: isMain ? 'main' : 'secondary',
        status: isActive ? 'active' : 'inactive',
        isMain: isMain,
        active: isActive,
        createdAt: backendBranch.createdAt,
        businessName: undefined,
      };
    } catch (error) {
      console.error('Error creating branch:', error);
      return null;
    }
  }

  /**
   * Update a branch
   */
  async updateBranch(companyId: string, branchId: string, data: Partial<{
    name: string;
    address: string;
    phone: string;
    type: 'main' | 'secondary';
    status: 'active' | 'inactive';
  }>): Promise<Branch | null> {
    try {
      const updateData: any = {};

      if (data.name) updateData.name = data.name;
      if (data.type) updateData.type = data.type === 'main' ? BranchType.MAIN : BranchType.SECONDARY;
      if (data.status) updateData.status = data.status === 'active' ? BranchStatus.ACTIVE : BranchStatus.INACTIVE;
      if (data.address) {
        updateData.address = {
          street: data.address,
          city: '', // Would need proper address parsing
          country: '',
        };
      }
      if (data.phone) {
        updateData.contact = { phone: data.phone };
      }

      const backendBranch = await branchAPI.updateBranch(companyId, branchId, updateData);

      const isMain = backendBranch.type === BranchType.MAIN || backendBranch.isDefault;
      const isActive = backendBranch.status === BranchStatus.ACTIVE;

      return {
        id: backendBranch.id,
        name: backendBranch.name,
        address: this.formatAddress(backendBranch.address),
        phone: backendBranch.contact?.phone || backendBranch.contact?.mobile || '',
        type: isMain ? 'main' : 'secondary',
        status: isActive ? 'active' : 'inactive',
        isMain: isMain,
        active: isActive,
        createdAt: backendBranch.createdAt,
        businessName: undefined,
      };
    } catch (error) {
      console.error('Error updating branch:', error);
      return null;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(companyId: string, branchId: string): Promise<boolean> {
    try {
      await branchAPI.deleteBranch(companyId, branchId);
      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);
      return false;
    }
  }

  /**
   * Set a branch as the default/main branch
   */
  async setMainBranch(companyId: string, branchId: string): Promise<boolean> {
    try {
      await branchAPI.setDefaultBranch(companyId, branchId);
      return true;
    } catch (error) {
      console.error('Error setting main branch:', error);
      return false;
    }
  }

  /**
   * Get branch count for company (useful for trial limits)
   */
  async getBranchCount(companyId: string): Promise<number> {
    try {
      return await branchAPI.getBranchCount(companyId);
    } catch (error) {
      console.error('Error getting branch count:', error);
      return 0;
    }
  }

  /**
   * Helper method to format address from backend format to simple string
   */
  private formatAddress(address: any): string {
    if (typeof address === 'string') return address;
    
    if (address?.formattedAddress) {
      return address.formattedAddress;
    }
    
    const parts = [
      address?.street,
      address?.city,
      address?.state,
      address?.country
    ].filter(Boolean);
    
    return parts.join(', ') || '';
  }
}

// Create and export singleton instance
export const branchesApiService = new BranchesApiService();
export default branchesApiService;