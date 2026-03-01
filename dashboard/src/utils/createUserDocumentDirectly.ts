import { auth, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

export async function createUserDocumentDirectly() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('No authenticated user found');
    return false;
  }

  try {
    // Try to call a cloud function to create user document
    const createUserDoc = httpsCallable(functions, 'createUserDocument');
    const result = await createUserDoc({
      userId: currentUser.uid,
      email: currentUser.email,
      name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
    });
    
    console.log('User document created via cloud function:', result);
    
    // Force token refresh
    await currentUser.getIdToken(true);
    
    return true;
  } catch (error) {
    console.error('Error creating user document via cloud function:', error);
    
    // If cloud function doesn't exist, we'll need to handle this differently
    console.log('Please ensure the createUserDocument cloud function is deployed');
    return false;
  }
}

// Make it available globally for debugging
(window as any).createUserDocumentDirectly = createUserDocumentDirectly;