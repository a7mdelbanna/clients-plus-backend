import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

let initialized = false;

export function initializeUserOnAuth() {
  if (initialized) return;
  initialized = true;
  
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    
    // Add a small delay to ensure auth state is fully initialized
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a minimal user document if it doesn't exist
    const userRef = doc(db, 'users', user.uid);
    
    try {
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        console.log('Creating initial user document for:', user.uid);
        
        // Get user claims to include companyId if available
        const idTokenResult = await user.getIdTokenResult();
        const companyId = idTokenResult.claims.companyId as string | undefined;
        
        // Create minimal document with companyId if available
        const userData: any = {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          createdAt: serverTimestamp(),
          active: true,
        };
        
        // Only add companyId if it exists in claims
        if (companyId) {
          userData.companyId = companyId;
          userData.role = idTokenResult.claims.role || 'USER';
        }
        
        await setDoc(userRef, userData);
        console.log('Initial user document created');
      }
    } catch (error: any) {
      // If permission denied, it might be because the document already exists
      if (error.code === 'permission-denied') {
        console.log('User document might already exist or permission issue');
      } else {
        console.error('Failed to create user document:', error);
      }
    }
  });
}