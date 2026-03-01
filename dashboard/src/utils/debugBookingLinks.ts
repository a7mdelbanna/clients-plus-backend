import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Debug function to check booking links
export async function debugBookingLinks(companyId: string) {
  try {
    console.log('=== Debugging Booking Links ===');
    console.log('Company ID:', companyId);
    
    // Get all booking links for the company
    const q = query(
      collection(db, 'bookingLinks'),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} booking links`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('\n--- Booking Link ---');
      console.log('ID:', doc.id);
      console.log('Name:', data.name);
      console.log('Slug:', data.slug);
      console.log('Branch Settings:', data.branchSettings);
      
      if (data.branchSettings) {
        console.log('  Mode:', data.branchSettings.mode);
        console.log('  Allowed Branches:', data.branchSettings.allowedBranches);
        console.log('  Is Array?', Array.isArray(data.branchSettings.allowedBranches));
        console.log('  Branch Count:', data.branchSettings.allowedBranches?.length || 0);
        
        if (data.branchSettings.allowedBranches) {
          console.log('  Branch IDs:', data.branchSettings.allowedBranches);
        }
      }
      
      console.log('Legacy branchId:', data.branchId);
    });
    
    // Also check branches
    console.log('\n=== Company Branches ===');
    const branchesSnapshot = await getDocs(
      collection(db, 'companies', companyId, 'branches')
    );
    
    console.log(`Found ${branchesSnapshot.size} branches`);
    branchesSnapshot.forEach((doc) => {
      const branch = doc.data();
      console.log(`- Branch: ${branch.name} (ID: ${doc.id}, Status: ${branch.status})`);
    });
    
  } catch (error) {
    console.error('Error debugging booking links:', error);
  }
}

// Make it available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugBookingLinks = debugBookingLinks;
}