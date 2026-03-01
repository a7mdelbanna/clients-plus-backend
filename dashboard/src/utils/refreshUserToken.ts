import { auth } from '../config/firebase';
import type { User } from 'firebase/auth';

export const refreshUserToken = async (user: User): Promise<void> => {
  try {
    console.log('Refreshing user token for:', user.uid);
    
    // Force token refresh
    await user.getIdToken(true);
    
    // Get the refreshed token result
    const idTokenResult = await user.getIdTokenResult();
    console.log('Token refreshed. Claims:', idTokenResult.claims);
    
    // Check if companyId is in claims
    if (!idTokenResult.claims.companyId) {
      console.warn('Warning: User token does not contain companyId claim');
    }
  } catch (error) {
    console.error('Error refreshing user token:', error);
    throw error;
  }
};

export const ensureValidToken = async (): Promise<User | null> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.warn('No authenticated user found');
    return null;
  }
  
  await refreshUserToken(currentUser);
  return currentUser;
};