import admin from 'firebase-admin';
import { logger } from './logger';

/**
 * Firebase Admin SDK configuration for Express backend
 * 
 * This service provides Firebase Admin functionality to:
 * - Verify Firebase ID tokens from client authentication
 * - Access Firestore data when needed
 * - Maintain integration with existing Firebase infrastructure
 */
class FirebaseService {
  private app: admin.app.App | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initialize(): void {
    try {
      if (admin.apps.length === 0) {
        // Check if service account key is provided
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const projectId = process.env.FIREBASE_PROJECT_ID;

        if (serviceAccount && projectId) {
          // Parse service account JSON from environment variable
          const serviceAccountKey = JSON.parse(serviceAccount);
          
          this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccountKey),
            projectId: projectId,
          });

          logger.info('Firebase Admin SDK initialized successfully');
          this.initialized = true;
        } else {
          // Try to initialize with default credentials (for Cloud Run, etc.)
          try {
            this.app = admin.initializeApp();
            logger.info('Firebase Admin SDK initialized with default credentials');
            this.initialized = true;
          } catch (error) {
            logger.warn('Firebase Admin SDK not initialized - Firebase integration disabled');
            logger.warn('Set FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID environment variables to enable Firebase integration');
          }
        }
      } else {
        this.app = admin.apps[0] as admin.app.App;
        this.initialized = true;
        logger.info('Firebase Admin SDK already initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
    }
  }

  /**
   * Get Firebase Admin app instance
   */
  getApp(): admin.app.App | null {
    return this.app;
  }

  /**
   * Get Firestore database instance
   */
  getFirestore(): admin.firestore.Firestore | null {
    if (!this.initialized || !this.app) {
      return null;
    }
    return admin.firestore(this.app);
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth(): admin.auth.Auth | null {
    if (!this.initialized || !this.app) {
      return null;
    }
    return admin.auth(this.app);
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
    try {
      if (!this.initialized || !this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const auth = admin.auth(this.app);
      const decodedToken = await auth.verifyIdToken(idToken);
      
      logger.debug('Firebase ID token verified successfully', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        phone: decodedToken.phone_number,
      });

      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify Firebase ID token:', error);
      return null;
    }
  }

  /**
   * Get user by UID
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      if (!this.initialized || !this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const auth = admin.auth(this.app);
      const userRecord = await auth.getUser(uid);
      
      return userRecord;
    } catch (error) {
      logger.error(`Failed to get user with UID ${uid}:`, error);
      return null;
    }
  }

  /**
   * Check if Firebase is available
   */
  isAvailable(): boolean {
    return this.initialized && this.app !== null;
  }

  /**
   * Get client data from Firestore by phone number
   */
  async getClientByPhone(phoneNumber: string, companyId?: string): Promise<any> {
    try {
      if (!this.initialized || !this.app) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const db = admin.firestore(this.app);
      const clientsRef = db.collection('clients');

      // Normalize phone number to match Firestore format
      let normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '').replace(/^\+20/, '');
      if (normalizedPhone && !normalizedPhone.startsWith('0')) {
        normalizedPhone = '0' + normalizedPhone;
      }

      let query = clientsRef.where('phone', '==', normalizedPhone);
      
      // Add company filter if provided
      if (companyId) {
        query = query.where('companyId', '==', companyId);
      }

      const snapshot = await query.limit(1).get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        name: data.name || data.firstName || 'عميل',
        phone: data.phone,
        email: data.email,
        companyId: data.companyId,
        ...data
      };
    } catch (error) {
      logger.error(`Failed to get client by phone ${phoneNumber}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;