import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { branchesApiService, type Branch as ApiBranch } from '../services/api/branches.api.service';

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

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  loading: boolean;
  switchBranch: (branchId: string) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

interface BranchProviderProps {
  children: ReactNode;
}

const BRANCH_STORAGE_KEY = 'selectedBranchId';

export const BranchProvider: React.FC<BranchProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Load branches from backend API
  useEffect(() => {
    if (!currentUser) {
      setBranches([]);
      setCurrentBranch(null);
      setLoading(false);
      return;
    }

    const loadBranches = async () => {
      try {
        // Get company ID from the backend user object
        let cId = currentUser.companyId;
        
        if (!cId) {
          console.error('[BranchContext] No company ID found for user', {
            userId: currentUser.id || currentUser.id,
            email: currentUser.email
          });
          setLoading(false);
          return;
        }

        setCompanyId(cId);

        // Fetch branches from API
        const branchList = await branchesApiService.getBranches(cId);
        
        console.log('[BranchContext] Loaded branches from API:', branchList.map(b => ({
          id: b.id,
          name: b.name,
          type: b.type,
          status: b.status
        })));

        setBranches(branchList);

        // Set current branch
        if (branchList.length > 0) {
          // Try to restore previously selected branch
          const savedBranchId = localStorage.getItem(BRANCH_STORAGE_KEY);
          console.log('[BranchContext] Saved branch ID:', savedBranchId);
          
          const savedBranch = branchList.find(b => b.id === savedBranchId);
          
          if (savedBranch) {
            console.log('[BranchContext] Found saved branch:', savedBranch.name);
            setCurrentBranch(savedBranch);
          } else {
            // Default to main branch or first branch
            const mainBranch = branchList.find(b => b.isMain || b.type === 'main') || branchList[0];
            console.log('[BranchContext] Using default branch:', mainBranch?.name);
            setCurrentBranch(mainBranch);
            if (mainBranch) {
              localStorage.setItem(BRANCH_STORAGE_KEY, mainBranch.id);
            }
          }
        } else {
          console.warn('[BranchContext] No branches loaded - this may be during setup');
          // Don't set an error state here, as branches might not exist yet during setup
        }

        setLoading(false);
      } catch (error) {
        console.error('[BranchContext] Error loading branches:', {
          error: error,
          companyId: companyId,
          userId: currentUser.id || currentUser.id
        });
        setLoading(false);
      }
    };

    loadBranches();
  }, [currentUser]);

  const switchBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setCurrentBranch(branch);
      localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
    }
  };

  const refreshBranches = async () => {
    if (!currentUser?.companyId) {
      console.warn('[BranchContext] Cannot refresh branches - no company ID');
      return;
    }

    try {
      setLoading(true);
      const branchList = await branchesApiService.getBranches(currentUser.companyId);
      
      console.log('[BranchContext] Refreshed branches:', branchList.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type,
        status: b.status
      })));

      setBranches(branchList);

      // Update current branch if it's no longer in the list
      if (currentBranch) {
        const updatedCurrentBranch = branchList.find(b => b.id === currentBranch.id);
        if (updatedCurrentBranch) {
          setCurrentBranch(updatedCurrentBranch);
        } else if (branchList.length > 0) {
          // Current branch was deleted, switch to main or first available
          const mainBranch = branchList.find(b => b.isMain || b.type === 'main') || branchList[0];
          setCurrentBranch(mainBranch);
          localStorage.setItem(BRANCH_STORAGE_KEY, mainBranch.id);
        }
      }
    } catch (error) {
      console.error('[BranchContext] Error refreshing branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: BranchContextType = {
    branches,
    currentBranch,
    loading,
    switchBranch,
    refreshBranches,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};