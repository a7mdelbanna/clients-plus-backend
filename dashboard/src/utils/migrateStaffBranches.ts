import { collection, getDocs, updateDoc, doc, writeBatch, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migrate staff from single branchId to branchIds array
 * This function can be run from the browser console
 */
export async function migrateStaffBranches(companyId: string) {
  try {
    console.log('Starting staff branch migration for company:', companyId);
    
    const staffRef = collection(db, 'staff');
    const q = query(staffRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Skip if already has branchIds
      if (data.branchIds && data.branchIds.length > 0) {
        return;
      }
      
      // Migrate from single branchId to array
      if (data.branchId) {
        batch.update(doc.ref, {
          branchIds: [data.branchId],
          updatedAt: serverTimestamp()
        });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Successfully migrated ${count} staff members to use branchIds array`);
    } else {
      console.log('No staff members needed migration');
    }
    
    return count;
  } catch (error) {
    console.error('Error migrating staff branches:', error);
    throw error;
  }
}

// Make it available in the browser console for manual migration
if (typeof window !== 'undefined') {
  (window as any).migrateStaffBranches = migrateStaffBranches;
}