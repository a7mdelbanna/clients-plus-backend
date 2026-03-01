import { httpsCallable } from 'firebase/functions';
import { functions, auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const checkAndMigrateUserClaims = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No authenticated user');
      return false;
    }

    // Get current token claims
    const idTokenResult = await currentUser.getIdTokenResult();
    const claims = idTokenResult.claims;
    
    console.log('Current user claims:', claims);

    // Check if user already has companyId claim
    if (claims.companyId && claims.role) {
      console.log('User already has proper claims');
      return true;
    }

    console.log('User missing claims, attempting migration...');

    // Get user document to find companyId
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (!userDoc.exists()) {
      console.error('User document not found');
      return false;
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;
    const role = userData.role || 'USER';

    if (!companyId) {
      console.error('No company ID found in user document');
      return false;
    }

    // Call the refreshUserClaims function
    try {
      const refreshClaims = httpsCallable(functions, 'refreshUserClaims');
      const result = await refreshClaims();
      console.log('Claims refresh result:', result.data);
      
      // Force token refresh
      await currentUser.getIdToken(true);
      
      // Verify new claims
      const newTokenResult = await currentUser.getIdTokenResult();
      console.log('New claims after migration:', newTokenResult.claims);
      
      return true;
    } catch (error) {
      console.error('Error refreshing claims:', error);
      
      // Fallback: try updateUserClaims
      try {
        const updateClaims = httpsCallable(functions, 'updateUserClaims');
        await updateClaims({
          userId: currentUser.uid,
          claims: {
            companyId: companyId,
            role: role,
            setupCompleted: userData.setupCompleted || false
          }
        });
        
        // Force token refresh
        await currentUser.getIdToken(true);
        
        console.log('Claims updated via fallback method');
        return true;
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        return false;
      }
    }
  } catch (error) {
    console.error('Error in checkAndMigrateUserClaims:', error);
    return false;
  }
};

// Add to window for manual debugging
if (typeof window !== 'undefined') {
  (window as any).checkAndMigrateUserClaims = checkAndMigrateUserClaims;
}