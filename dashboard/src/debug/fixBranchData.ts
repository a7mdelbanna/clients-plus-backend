import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function debugFixBranchData(companyId: string, branchId: string) {
  try {
    console.log('=== DEBUG: Fixing branch data ===');
    console.log('Company ID:', companyId);
    console.log('Branch ID:', branchId);
    
    const branchRef = doc(db, 'companies', companyId, 'branches', branchId);
    
    // Update branch to have proper type and status
    await updateDoc(branchRef, {
      type: 'secondary',
      status: 'active'
    });
    
    console.log('✅ Branch data fixed successfully');
    console.log('Branch now has type: secondary and status: active');
    
    return true;
  } catch (error) {
    console.error('Error fixing branch data:', error);
    return false;
  }
}

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugFixBranchData = debugFixBranchData;
}