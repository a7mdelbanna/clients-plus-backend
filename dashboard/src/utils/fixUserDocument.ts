import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function ensureUserDocument() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('No current user');
    return;
  }

  try {
    // Check if user document exists
    const userRef = doc(db, 'users', currentUser.uid);
    let userDoc;
    try {
      userDoc = await getDoc(userRef);
    } catch (error) {
      console.log('Error reading user document, will create it:', error);
      userDoc = { exists: () => false };
    }
    
    if (!userDoc.exists()) {
      console.log('Creating missing user document for:', currentUser.uid);
      
      // Get token to check for existing companyId
      const idTokenResult = await currentUser.getIdTokenResult();
      const companyId = idTokenResult.claims.companyId as string | undefined;
      
      // Build user data object
      const userData: any = {
        id: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        active: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      
      // Only add companyId and role if companyId exists
      if (companyId) {
        userData.companyId = companyId;
        userData.role = idTokenResult.claims.role || 'USER';
      }
      
      // Create the user document
      await setDoc(userRef, userData);
      
      console.log('User document created successfully');
    } else {
      console.log('User document already exists');
      
      // Update last login - use merge to avoid overwriting existing data
      try {
        await setDoc(userRef, {
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
      } catch (updateError) {
        console.log('Could not update last login:', updateError);
      }
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log('Permission denied - user document might already exist');
    } else {
      console.error('Error ensuring user document:', error);
    }
  }
}