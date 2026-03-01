/**
 * Development utility to manually create a superadmin user
 * This should only be used in development environments
 * 
 * For production, use a secure server-side script with Firebase Admin SDK
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function createSuperadminDev(userId: string, email: string, displayName: string) {
  try {
    // This function assumes the user already exists in Firebase Auth
    // You need to create the user first through Firebase Console or regular signup
    
    console.log('Creating superadmin document...');
    
    const superadminData = {
      uid: userId,
      email: email,
      displayName: displayName,
      role: 'superadmin',
      createdAt: serverTimestamp(),
      lastLogin: null,
    };

    await setDoc(doc(db, 'superadmins', userId), superadminData);
    
    console.log('✅ Superadmin document created successfully!');
    console.log('Note: Custom claims must be set server-side for full functionality');
    console.log(`The user can now login at: /sa-${import.meta.env.VITE_SUPERADMIN_URL_HASH}/login`);
    
    return true;
  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    return false;
  }
}

// Make it available in the browser console for development
if (typeof window !== 'undefined') {
  (window as any).createSuperadminDev = createSuperadminDev;
  console.log('✅ createSuperadminDev function is now available in the console');
  console.log('Usage: await createSuperadminDev("USER_UID", "email@example.com", "Display Name")');
}