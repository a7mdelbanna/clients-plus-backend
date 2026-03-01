import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function debugCheckBranches(companyId: string) {
  try {
    console.log('=== DEBUG: Checking branches ===');
    console.log('Company ID:', companyId);
    
    const branchesRef = collection(db, 'companies', companyId, 'branches');
    const snapshot = await getDocs(branchesRef);
    
    console.log('Total branches found:', snapshot.size);
    
    const branches: any[] = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      branches.push({
        id: doc.id,
        name: data.name,
        type: data.type,
        status: data.status,
        isMain: data.type === 'main'
      });
      console.log(`Branch: ${data.name} (ID: ${doc.id}, Type: ${data.type}, Status: ${data.status})`);
    });
    
    return branches;
  } catch (error) {
    console.error('Error checking branches:', error);
  }
}

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugCheckBranches = debugCheckBranches;
}