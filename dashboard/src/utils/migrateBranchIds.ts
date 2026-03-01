/**
 * Migration utility to fix branch ID mismatches
 * This fixes branches that were created with id: '1' but should be using document ID
 */

import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function migrateBranchIds(companyId: string): Promise<void> {
  try {
    console.log('Starting branch ID migration for company:', companyId);
    
    const branchesRef = collection(db, 'companies', companyId, 'branches');
    const branchesSnapshot = await getDocs(branchesRef);
    
    for (const branchDoc of branchesSnapshot.docs) {
      const branchData = branchDoc.data();
      
      // Check if this branch has id: '1' but document ID is different
      if (branchData.id === '1' && branchDoc.id !== '1') {
        console.log(`Found branch with mismatched ID. Doc ID: ${branchDoc.id}, Data ID: ${branchData.id}`);
        
        // Create a new document with ID '1'
        const newBranchRef = doc(db, 'companies', companyId, 'branches', '1');
        await setDoc(newBranchRef, {
          ...branchData,
          // Don't include the id field in the document data
          id: undefined,
        });
        
        // Delete the old document
        await deleteDoc(branchDoc.ref);
        
        console.log('Branch migrated successfully');
      }
      
      // Also check for main branch
      if (branchData.isMain && branchData.id === '1' && branchDoc.id !== 'main') {
        console.log('Migrating main branch to use "main" as ID');
        
        // Create a new document with ID 'main'
        const mainBranchRef = doc(db, 'companies', companyId, 'branches', 'main');
        await setDoc(mainBranchRef, {
          ...branchData,
          id: undefined,
        });
        
        // If we haven't already deleted this document
        if (branchDoc.id !== '1') {
          await deleteDoc(branchDoc.ref);
        }
      }
    }
    
    console.log('Branch ID migration completed');
  } catch (error) {
    console.error('Error during branch ID migration:', error);
    throw error;
  }
}

// Make it available in the console for manual migration
if (typeof window !== 'undefined') {
  (window as any).migrateBranchIds = migrateBranchIds;
}