import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function manualFixUserDocument() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('No authenticated user found. Please login first.');
    return false;
  }

  try {
    console.log('Checking user document for:', currentUser.uid);
    
    // Check if user document exists
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('User document missing. Creating it now...');
      
      // Get token to check for existing companyId
      const idTokenResult = await currentUser.getIdTokenResult();
      const companyId = idTokenResult.claims.companyId as string || null;
      
      // Create the user document
      await setDoc(userRef, {
        id: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        companyId: companyId,
        role: idTokenResult.claims.role || 'USER',
        active: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      
      console.log('User document created successfully');
      
      // Force token refresh to ensure claims are up to date
      await currentUser.getIdToken(true);
      console.log('Token refreshed successfully');
      
      return true;
    } else {
      console.log('User document already exists');
      
      // Update last login
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      }, { merge: true });
      
      // Force token refresh
      await currentUser.getIdToken(true);
      console.log('User document and token updated');
      
      return true;
    }
  } catch (error) {
    console.error('Error fixing user document:', error);
    return false;
  }
}

// Function to manually trigger the fix from browser console
(window as any).fixUserDocument = manualFixUserDocument;