import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';
import { setupService } from '../services/setup.service';

export const updateUserClaims = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('No authenticated user');
      return;
    }

    console.log('Refreshing claims for user:', currentUser.uid);

    // Call cloud function to refresh claims
    const refreshClaims = httpsCallable(functions, 'refreshUserClaims');
    const result = await refreshClaims();
    
    console.log('Claims refresh result:', result.data);

    // Force token refresh
    await currentUser.getIdToken(true);
    
    const idTokenResult = await currentUser.getIdTokenResult();
    console.log('Claims updated successfully:', idTokenResult.claims);

    // Reload the page to apply new claims
    window.location.reload();
  } catch (error: any) {
    console.error('Error updating user claims:', error);
    
    // If refreshUserClaims doesn't exist yet, try the old method
    if (error.code === 'functions/not-found') {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        const companyId = await setupService.getUserCompanyId(currentUser.uid);
        if (!companyId) return;
        
        const updateClaims = httpsCallable(functions, 'updateUserClaims');
        await updateClaims({
          userId: currentUser.uid,
          claims: {
            companyId: companyId,
            role: 'ADMIN',
            setupCompleted: true
          }
        });
        
        await currentUser.getIdToken(true);
        window.location.reload();
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
};

// Add to window for manual debugging
if (typeof window !== 'undefined') {
  (window as any).updateUserClaims = updateUserClaims;
}