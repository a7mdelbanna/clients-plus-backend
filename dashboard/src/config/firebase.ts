import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCVvQYtP8Qpejp0iAXwad7R75H314uRwTA",
  authDomain: "clients-plus-egypt.firebaseapp.com",
  projectId: "clients-plus-egypt",
  storageBucket: "clients-plus-egypt.firebasestorage.app",
  messagingSenderId: "828797609439",
  appId: "1:828797609439:web:73106534d5f3128fc9106a",
  measurementId: "G-Q3CLFWR6Y8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
export const storage = getStorage(app);

// Connect to emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}